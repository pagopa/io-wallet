import { parse, ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { decode as cborDecode } from "cbor-x";
import { createPublicKey } from "crypto";
import { X509Certificate } from "crypto";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import { sequenceS } from "fp-ts/lib/Apply";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
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
  base64ToPem,
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { GoogleAppCredentials } from "./android/assertion";
import { AndroidAssertionError } from "./errors";
import {
  iOsAssertion,
  iOsAttestation,
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
      TE.tryCatch(() => calculateJwkThumbprint(jwk, "sha256"), E.toError),
      TE.chainEitherKW((jwk_thumbprint) =>
        pipe(
          { challenge: nonce, jwk_thumbprint },
          J.stringify,
          E.mapLeft(() => new ValidationError(["Unable to create clientData"])),
        ),
      ),
      TE.chainW((clientData) =>
        pipe(
          this.parseIosAssertion({
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
              this.#configuration.skipSignatureValidation,
            ),
          ),
          TE.orElseW(() =>
            pipe(
              this.parseGoogleAppCredentials(
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
      E.tryCatch(
        () => Buffer.from(attestation, "base64"),
        () => new Error(`Invalid attestation: ${attestation}`),
      ),
      TE.fromEither,
      TE.chainW((data) =>
        pipe(
          this.parseIosAttestation(data),
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
          TE.orElseW(() =>
            pipe(
              this.parseAndroidAttestation(data),
              TE.fromEither,
              TE.chainW((x509Chain) =>
                validateAndroidAttestation(
                  x509Chain,
                  nonce,
                  this.#configuration.androidBundleIdentifiers,
                  this.#configuration.googlePublicKeys,
                  this.#configuration.androidCrlUrl,
                  this.#configuration.httpRequestTimeout,
                ),
              ),
              TE.mapLeft(toIntegrityCheckError),
            ),
          ),
        ),
      ),
    );

  private parseAndroidAttestation = (data: Buffer) =>
    pipe(
      data.toString("utf-8").split(","),
      A.map((b64) =>
        E.tryCatch(
          () => new X509Certificate(base64ToPem(b64)),
          () =>
            new Error("Not a valid Android attestation (X509 parse failed)"),
        ),
      ),
      A.sequence(E.Applicative),
    );

  private parseGoogleAppCredentials = (googleAppCredentialsEncoded: string) =>
    pipe(
      E.tryCatch(
        () => Buffer.from(googleAppCredentialsEncoded, "base64").toString(),
        E.toError,
      ),
      E.chain(J.parse),
      E.mapLeft(
        () =>
          new AndroidAssertionError(
            "Unable to parse Google App Credentials string",
          ),
      ),
      E.chainW(parse(GoogleAppCredentials, "Invalid Google App Credentials")),
    );

  private parseIosAssertion = ({
    hardwareSignature,
    integrityAssertion,
  }: {
    hardwareSignature: NonEmptyString;
    integrityAssertion: NonEmptyString;
  }) =>
    pipe(
      sequenceS(E.Applicative)({
        authenticatorData: E.tryCatch(
          () => Buffer.from(integrityAssertion, "base64"),
          E.toError,
        ),
        signature: E.tryCatch(
          () => Buffer.from(hardwareSignature, "base64"),
          E.toError,
        ),
      }),
      E.chainW(
        parse(iOsAssertion, "[iOS Assertion] assertion format is invalid"),
      ),
    );

  private parseIosAttestation = (data: Buffer) =>
    pipe(
      E.tryCatch(() => cborDecode(data), E.toError),
      E.chainW(
        parse(
          iOsAttestation,
          "[iOS Attestation] attestation format is invalid",
        ),
      ),
    );
}

export { ValidatedAttestation };
