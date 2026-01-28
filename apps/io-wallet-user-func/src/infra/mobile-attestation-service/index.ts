import { ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { decode as cborDecode } from "cbor-x";
import { createPublicKey } from "crypto";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
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
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";

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
          this.isIosAttestation(integrityAssertion),
          TE.fromEither,
          TE.chainW((isIos) =>
            isIos
              ? validateiOSAssertion(
                  integrityAssertion,
                  hardwareSignature,
                  clientData,
                  hardwareKey,
                  signCount,
                  this.#configuration.iosBundleIdentifiers,
                  this.#configuration.iOsTeamIdentifier,
                  this.#configuration.skipSignatureValidation,
                )
              : validateAndroidAssertion(
                  integrityAssertion,
                  hardwareSignature,
                  clientData,
                  hardwareKey,
                  this.#configuration.androidBundleIdentifiers,
                  this.#configuration.androidPlayStoreCertificateHash,
                  this.#configuration.googleAppCredentialsEncoded,
                  this.#configuration.androidPlayIntegrityUrl,
                  this.allowDevelopmentEnvironmentForUser(user),
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
          this.isIosAttestation(data),
          TE.fromEither,
          TE.chainW((isIos) =>
            isIos
              ? validateiOSAttestation(
                  data,
                  nonce,
                  hardwareKeyTag,
                  this.#configuration.iosBundleIdentifiers,
                  this.#configuration.iOsTeamIdentifier,
                  this.#configuration.appleRootCertificate,
                  this.allowDevelopmentEnvironmentForUser(user),
                )
              : pipe(
                  validateAndroidAttestation(
                    data,
                    nonce,
                    this.#configuration.androidBundleIdentifiers,
                    this.#configuration.googlePublicKeys,
                    this.#configuration.androidCrlUrl,
                    this.#configuration.httpRequestTimeout,
                  ),
                  TE.mapLeft(toIntegrityCheckError),
                ),
          ),
        ),
      ),
    );

  private isIosAttestation = (
    input: Buffer | string,
  ): E.Either<Error, boolean> =>
    pipe(
      typeof input === "string"
        ? E.tryCatch(() => Buffer.from(input, "base64"), E.toError)
        : E.right(input),
      E.chain((buf) => E.tryCatch(() => cborDecode(buf), E.toError)),
      E.map(
        (decoded) =>
          // typeof decoded === "object" &&
          // decoded !== null &&
          decoded.fmt === "apple-appattest",
      ),
    );
}

export { ValidatedAttestation };
