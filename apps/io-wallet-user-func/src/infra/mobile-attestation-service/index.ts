import { ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createPublicKey } from "crypto";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { PathReporter } from "io-ts/PathReporter";
import {
  AndroidDeviceDetails,
  DeviceDetails,
} from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";
import * as jose from "jose";

import { AttestationServiceConfiguration } from "@/app/config";
import {
  AttestationService,
  ValidateAssertionRequest,
  ValidatedAttestation,
} from "@/attestation-service";

import {
  AndroidKeyAttestationConfig,
  parseAndroidAttestation,
  parseGoogleAppCredentials,
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { ExternalServiceError } from "./android/assertion";
import { GRAPHENEOS_ALLOWLIST_SNAPSHOT } from "./android/grapheneos-allowlist";
import { toClientData, toThumbprint } from "./client-data";
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

const toSingleKeyClientData = (
  nonce: NonEmptyString,
  jwk: JwkPublicKey,
): TE.TaskEither<Error | ValidationError, string> =>
  pipe(
    toThumbprint(jwk),
    TE.chainW((thumbprint) =>
      toClientData({
        challenge: nonce,
        thumbprint,
      }),
    ),
  );

const decodeBase64ToBuffer = (value: NonEmptyString): E.Either<Error, Buffer> =>
  E.tryCatch(
    () => Buffer.from(value, "base64"),
    () => new Error(`Invalid base64 value: ${value}`),
  );

export class MobileAttestationService implements AttestationService {
  #configuration: AttestationServiceConfiguration;
  #trustedSelfSignedBootKeys: () => ReadonlySet<string>;

  /**
   * @param cnf - The attestation service configuration
   * @param trustedSelfSignedBootKeys - Getter of the allowed GrapheneOS verified boot keys
   */
  constructor(
    cnf: AttestationServiceConfiguration,
    trustedSelfSignedBootKeys: () => ReadonlySet<string> = () =>
      new Set(GRAPHENEOS_ALLOWLIST_SNAPSHOT.verifiedBootKeys),
  ) {
    this.#configuration = cnf;
    this.#trustedSelfSignedBootKeys = trustedSelfSignedBootKeys;
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

  validateAndroidAssertion = ({
    deviceDetails,
    hardwareKey,
    hardwareKeyAttestation,
    hardwareSignature,
    integrityAssertion,
    jwk,
    nonce,
    user,
  }: ValidateAssertionRequest) =>
    pipe(
      toSingleKeyClientData(nonce, jwk),
      TE.chainW((clientData) =>
        verifyAndroidAssertion({
          clientData,
          deviceDetails,
          hardwareKey,
          hardwareKeyAttestation,
          hardwareSignature,
          integrityAssertion,
          user,
        })({ assertionValidationConfig: this.#assertionValidationConfig() }),
      ),
    );

  validateAssertion = ({
    deviceDetails,
    hardwareKey,
    hardwareKeyAttestation,
    hardwareSignature,
    integrityAssertion,
    jwk,
    nonce,
    signCount,
    user,
  }: ValidateAssertionRequest) =>
    pipe(
      toSingleKeyClientData(nonce, jwk),
      TE.chainW((clientData) =>
        pipe(
          integrityAssertion
            ? parseIosAssertion({
                hardwareSignature,
                integrityAssertion,
              })
            : E.left(new Error("Missing iOS integrity assertion")),
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
                validateAndroidAssertion({
                  allowDevelopmentEnvironment:
                    this.allowDevelopmentEnvironmentForUser(user),
                  androidPlayIntegrityUrl:
                    this.#configuration.androidPlayIntegrityUrl,
                  androidPlayStoreCertificateHash:
                    this.#configuration.androidPlayStoreCertificateHash,
                  bundleIdentifiers:
                    this.#configuration.androidBundleIdentifiers,
                  clientData,
                  deviceDetails,
                  googleAppCredentials,
                  hardwareKey,
                  hardwareKeyAttestation,
                  hardwareSignature,
                  integrityAssertion,
                  keyAttestationConfig: this.#keyAttestationConfig(),
                }),
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
                  ...this.#keyAttestationConfig(),
                  // The attest key is pinned at registration and required for a self-signed OS
                  attestKey: { requiredForSelfSigned: true },
                  bundleIdentifiers:
                    this.#configuration.androidBundleIdentifiers,
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

  validateIosAssertion = ({
    hardwareKey,
    hardwareSignature,
    integrityAssertion,
    jwk,
    nonce,
    signCount,
  }: ValidateAssertionRequest) =>
    pipe(
      toSingleKeyClientData(nonce, jwk),
      TE.chainW((clientData) =>
        verifyIosAssertion({
          clientData,
          hardwareKey,
          hardwareSignature,
          integrityAssertion,
          signCount,
        })({ assertionValidationConfig: this.#assertionValidationConfig() }),
      ),
    );

  #assertionValidationConfig = (): AssertionValidationConfig => ({
    ...this.#configuration,
    trustedSelfSignedBootKeys: this.#trustedSelfSignedBootKeys,
  });

  #keyAttestationConfig = (): AndroidKeyAttestationConfig => ({
    androidCrlUrl: this.#configuration.androidCrlUrl,
    googlePublicKeys: this.#configuration.googlePublicKeys,
    httpRequestTimeout: this.#configuration.httpRequestTimeout,
    signatureDigests: this.#configuration.androidSigningCertificateDigests,
    trustedSelfSignedBootKeys: this.#trustedSelfSignedBootKeys(),
  });
}

export { ValidatedAttestation };
export { toClientData, toKeysThumbprints, toThumbprint } from "./client-data";

const allowDevelopmentEnvironmentForUser: (
  user: FiscalCode,
) => R.Reader<AssertionValidationConfig, boolean> = (user) => (config) =>
  config.allowedDeveloperUsers.includes(user);

export interface AndroidAttestationValidationConfig {
  androidBundleIdentifiers: string[];
  androidCrlUrl: string;
  androidSigningCertificateDigests: string[];
  googlePublicKeys: string[];
  httpRequestTimeout: number;
  /** Getter of the allowed GrapheneOS verified boot keys. */
  trustedSelfSignedBootKeys: () => ReadonlySet<string>;
}

export interface AssertionValidationConfig {
  allowedDeveloperUsers: string[];
  androidBundleIdentifiers: string[];
  androidCrlUrl: string;
  androidPlayIntegrityUrl: string;
  androidPlayStoreCertificateHash: string;
  androidSigningCertificateDigests: string[];
  googleAppCredentialsEncoded: string;
  googlePublicKeys: string[];
  httpRequestTimeout: number;
  iosBundleIdentifiers: string[];
  iOsTeamIdentifier: string;
  /** Getter of the allowed GrapheneOS verified boot keys. */
  trustedSelfSignedBootKeys: () => ReadonlySet<string>;
}

export const verifyAndroidAssertion: (input: {
  clientData: string;
  deviceDetails?: DeviceDetails;
  hardwareKey: JwkPublicKey;
  hardwareKeyAttestation?: NonEmptyString;
  hardwareSignature: NonEmptyString;
  integrityAssertion?: NonEmptyString;
  user: FiscalCode;
}) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  ExternalServiceError | IntegrityCheckError,
  void
> =
  ({
    clientData,
    deviceDetails,
    hardwareKey,
    hardwareKeyAttestation,
    hardwareSignature,
    integrityAssertion,
    user,
  }) =>
  ({ assertionValidationConfig: config }) =>
    pipe(
      config.googleAppCredentialsEncoded,
      parseGoogleAppCredentials,
      TE.fromEither,
      TE.chain((googleAppCredentials) =>
        validateAndroidAssertion({
          allowDevelopmentEnvironment:
            allowDevelopmentEnvironmentForUser(user)(config),
          androidPlayIntegrityUrl: config.androidPlayIntegrityUrl,
          androidPlayStoreCertificateHash:
            config.androidPlayStoreCertificateHash,
          bundleIdentifiers: config.androidBundleIdentifiers,
          clientData,
          deviceDetails,
          googleAppCredentials,
          hardwareKey,
          hardwareKeyAttestation,
          hardwareSignature,
          integrityAssertion,
          keyAttestationConfig: {
            androidCrlUrl: config.androidCrlUrl,
            googlePublicKeys: config.googlePublicKeys,
            httpRequestTimeout: config.httpRequestTimeout,
            signatureDigests: config.androidSigningCertificateDigests,
            trustedSelfSignedBootKeys: config.trustedSelfSignedBootKeys(),
          },
        }),
      ),
      TE.mapLeft((androidErr) =>
        androidErr instanceof ExternalServiceError
          ? androidErr
          : new IntegrityCheckError([androidErr.message]),
      ),
    );

export const verifyIosAssertion: (input: {
  clientData: string;
  hardwareKey: JwkPublicKey;
  hardwareSignature: NonEmptyString;
  integrityAssertion?: NonEmptyString;
  signCount: number;
}) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  IntegrityCheckError,
  void
> =
  ({
    clientData,
    hardwareKey,
    hardwareSignature,
    integrityAssertion,
    signCount,
  }) =>
  ({ assertionValidationConfig: config }) =>
    pipe(
      integrityAssertion
        ? parseIosAssertion({
            hardwareSignature,
            integrityAssertion,
          })
        : E.left(new Error("Missing iOS integrity assertion")),
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
      TE.mapLeft((iosErr) => new IntegrityCheckError([iosErr.message])),
    );

export const verifyAndroidAttestation: (
  attestation: NonEmptyString,
  nonce: NonEmptyString,
) => RTE.ReaderTaskEither<
  { androidAttestationValidationConfig: AndroidAttestationValidationConfig },
  Error | IntegrityCheckError,
  { deviceDetails: AndroidDeviceDetails; jwk: JwkPublicKey }
> =
  (attestation, nonce) =>
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
          nonce,
          signatureDigests: config.androidSigningCertificateDigests,
          trustedSelfSignedBootKeys: config.trustedSelfSignedBootKeys(),
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
