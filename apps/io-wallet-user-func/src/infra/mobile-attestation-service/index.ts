import { ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createPublicKey } from "crypto";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as O from "fp-ts/Option";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { PathReporter } from "io-ts/PathReporter";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";
import * as jose from "jose";

import { AttestationServiceConfiguration } from "@/app/config";
import {
  AttestationService,
  ValidateAssertionRequest,
  ValidatedAttestation,
} from "@/attestation-service";

import {
  parseAndroidAttestation,
  parseGoogleAppCredentials,
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { ExternalServiceError } from "./android/assertion";
import {
  parseIosAssertion,
  parseIosAttestation,
  validateiOSAssertion,
  validateiOSAttestation,
} from "./ios";

export class IntegrityCheckError extends Error {
  name = "IntegrityCheckError";
  constructor(msg: string[]) {
    super(msg.join(" | "));
  }
}

const toIntegrityCheckError = (e: Error | ValidationError): Error =>
  e instanceof ValidationError ? new IntegrityCheckError(e.violations) : e;

const toClientData = (
  nonce: NonEmptyString,
  jwk: JwkPublicKey,
): TE.TaskEither<Error | ValidationError, string> =>
  pipe(
    TE.tryCatch(() => calculateJwkThumbprint(jwk, "sha256"), E.toError),
    TE.chainEitherKW((jwk_thumbprint) =>
      pipe(
        { challenge: nonce, jwk_thumbprint },
        J.stringify,
        E.mapLeft(() => new ValidationError(["Unable to create clientData"])),
      ),
    ),
  );

const decodeBase64ToBuffer = (value: NonEmptyString): E.Either<Error, Buffer> =>
  E.tryCatch(
    () => Buffer.from(value, "base64"),
    () => new Error(`Invalid base64 value: ${value}`),
  );

export class MobileAttestationService implements AttestationService {
  #configuration: AttestationServiceConfiguration;

  constructor(cnf: AttestationServiceConfiguration) {
    this.#configuration = cnf;
  }

  allowDevelopmentEnvironmentForUser = (user: FiscalCode) =>
    pipe(
      this.#configuration.allowedDeveloperUsers,
      RA.findFirst((allowedUser) => allowedUser === user),
      O.isSome,
    );

  getHardwarePublicTestKey = () =>
    pipe(
      E.tryCatch(
        () => createPublicKey(this.#configuration.hardwarePublicTestKey),
        E.toError,
      ),
      TE.fromEither,
      TE.chain((el) => TE.tryCatch(() => jose.exportJWK(el), E.toError)),
      TE.chainEitherKW(JwkPublicKey.decode),
      TE.mapLeft(() => new Error("Invalid test hardware public key")),
    );

  validateAssertion = ({
    hardwareKey,
    hardwareSignature,
    integrityAssertion,
    jwk,
    nonce,
    signCount,
    user,
  }: ValidateAssertionRequest) =>
    pipe(
      toClientData(nonce, jwk),
      TE.chainW((clientData) =>
        pipe(
          parseIosAssertion({
            hardwareSignature,
            integrityAssertion,
          }),
          TE.fromEither,
          TE.chainW((decodedAssertion) =>
            validateiOSAssertion(
              decodedAssertion,
              clientData,
              hardwareKey,
              signCount,
              this.#configuration.iosBundleIdentifiers,
              this.#configuration.iOsTeamIdentifier,
            ),
          ),
          TE.orElseW((iosErr) =>
            pipe(
              parseGoogleAppCredentials(
                this.#configuration.googleAppCredentialsEncoded,
              ),
              TE.fromEither,
              TE.chain((googleAppCredentials) =>
                validateAndroidAssertion(
                  integrityAssertion,
                  hardwareSignature,
                  clientData,
                  hardwareKey,
                  this.#configuration.androidBundleIdentifiers,
                  this.#configuration.androidPlayStoreCertificateHash,
                  googleAppCredentials,
                  this.#configuration.androidPlayIntegrityUrl,
                  this.allowDevelopmentEnvironmentForUser(user),
                ),
              ),
              TE.orElseW((androidErr) =>
                androidErr instanceof ExternalServiceError
                  ? TE.left(androidErr)
                  : TE.left(
                      new IntegrityCheckError([
                        iosErr.message,
                        androidErr.message,
                      ]),
                    ),
              ),
            ),
          ),
        ),
      ),
    );

  validateAttestation = (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString,
    user: FiscalCode,
  ): TE.TaskEither<Error | IntegrityCheckError, ValidatedAttestation> =>
    pipe(
      decodeBase64ToBuffer(attestation),
      TE.fromEither,
      TE.chainW((data) =>
        pipe(
          parseIosAttestation(data),
          TE.fromEither,
          TE.chainW((decoded) =>
            validateiOSAttestation(
              decoded,
              nonce,
              hardwareKeyTag,
              this.#configuration.iosBundleIdentifiers,
              this.#configuration.iOsTeamIdentifier,
              this.#configuration.appleRootCertificate,
              this.allowDevelopmentEnvironmentForUser(user),
            ),
          ),
          TE.orElseW((iosErr) =>
            pipe(
              parseAndroidAttestation(data),
              TE.fromEither,
              TE.chainW((x509Chain) =>
                validateAndroidAttestation({
                  androidCrlUrl: this.#configuration.androidCrlUrl,
                  bundleIdentifiers:
                    this.#configuration.androidBundleIdentifiers,
                  googlePublicKeys: this.#configuration.googlePublicKeys,
                  httpRequestTimeout: this.#configuration.httpRequestTimeout,
                  nonce,
                  x509Chain,
                }),
              ),
              TE.mapLeft(toIntegrityCheckError),
              TE.orElseW((androidErr) =>
                TE.left(
                  new IntegrityCheckError([iosErr.message, androidErr.message]),
                ),
              ),
            ),
          ),
        ),
      ),
    );
}

export { ValidatedAttestation };

const allowDevelopmentEnvironmentForUser: (
  user: FiscalCode,
) => R.Reader<AssertionValidationConfig, boolean> = (user) => (config) =>
  config.allowedDeveloperUsers.includes(user);

export interface AndroidAttestationValidationConfig {
  androidBundleIdentifiers: string[];
  androidCrlUrl: string;
  googlePublicKeys: string[];
  httpRequestTimeout: number;
}

export interface AssertionValidationConfig {
  allowedDeveloperUsers: string[];
  androidBundleIdentifiers: string[];
  androidPlayIntegrityUrl: string;
  androidPlayStoreCertificateHash: string;
  googleAppCredentialsEncoded: string;
  iosBundleIdentifiers: string[];
  iOsTeamIdentifier: string;
}

export const verifyAndroidAssertion: (
  input: Omit<ValidateAssertionRequest, "signCount">,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  ExternalServiceError | IntegrityCheckError,
  void
> =
  ({ hardwareKey, hardwareSignature, integrityAssertion, jwk, nonce, user }) =>
  ({ assertionValidationConfig: config }) =>
    pipe(
      toClientData(nonce, jwk),
      TE.chainW((clientData) =>
        pipe(
          config.googleAppCredentialsEncoded,
          parseGoogleAppCredentials,
          TE.fromEither,
          TE.chain((googleAppCredentials) =>
            validateAndroidAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              config.androidBundleIdentifiers,
              config.androidPlayStoreCertificateHash,
              googleAppCredentials,
              config.androidPlayIntegrityUrl,
              allowDevelopmentEnvironmentForUser(user)(config),
            ),
          ),
        ),
      ),
      TE.mapLeft((androidErr) =>
        androidErr instanceof ExternalServiceError
          ? androidErr
          : new IntegrityCheckError([androidErr.message]),
      ),
    );

export const verifyIosAssertion: (
  input: Omit<ValidateAssertionRequest, "user">,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  IntegrityCheckError,
  void
> =
  ({
    hardwareKey,
    hardwareSignature,
    integrityAssertion,
    jwk,
    nonce,
    signCount,
  }) =>
  ({ assertionValidationConfig: config }) =>
    pipe(
      toClientData(nonce, jwk),
      TE.chainW((clientData) =>
        pipe(
          parseIosAssertion({
            hardwareSignature,
            integrityAssertion,
          }),
          TE.fromEither,
          TE.chainW((decodedAssertion) =>
            validateiOSAssertion(
              decodedAssertion,
              clientData,
              hardwareKey,
              signCount,
              config.iosBundleIdentifiers,
              config.iOsTeamIdentifier,
            ),
          ),
        ),
      ),
      TE.mapLeft((iosErr) => new IntegrityCheckError([iosErr.message])),
    );

export const verifyAndroidAttestation: (
  attestation: NonEmptyString,
) => RTE.ReaderTaskEither<
  { androidAttestationValidationConfig: AndroidAttestationValidationConfig },
  Error | IntegrityCheckError,
  { deviceDetails: AndroidDeviceDetails; jwk: JwkPublicKey }
> =
  (attestation) =>
  ({ androidAttestationValidationConfig: config }) =>
    pipe(
      attestation,
      decodeBase64ToBuffer,
      E.chainW(parseAndroidAttestation),
      TE.fromEither,
      TE.chainW((x509Chain) =>
        validateAndroidAttestation({
          androidCrlUrl: config.androidCrlUrl,
          bundleIdentifiers: config.androidBundleIdentifiers,
          googlePublicKeys: config.googlePublicKeys,
          httpRequestTimeout: config.httpRequestTimeout,
          x509Chain,
        }),
      ),
      TE.chainEitherKW(({ deviceDetails, hardwareKey }) =>
        pipe(
          deviceDetails,
          AndroidDeviceDetails.decode,
          E.map((deviceDetails) => ({
            deviceDetails,
            jwk: hardwareKey,
          })),
          E.mapLeft(
            (errors) =>
              new Error(
                `Invalid Android device details: ${PathReporter.report(
                  E.left(errors),
                ).join(", ")}`,
              ),
          ),
        ),
      ),
      TE.mapLeft(toIntegrityCheckError),
      TE.mapLeft((androidErr) => new IntegrityCheckError([androidErr.message])),
    );
