import { ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
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

const getErrorMessages = (e: Error | ValidationError): string[] =>
  e instanceof ValidationError ? e.violations : [e.message];

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
          {
            challenge: nonce,
            jwk_thumbprint,
          },
          J.stringify,
          E.mapLeft(() => new ValidationError(["Unable to create clientData"])),
        ),
      ),
      TE.chainW((clientData) =>
        // First try iOS attestation validation, if it fails try Android assertion validation
        pipe(
          validateiOSAssertion(
            integrityAssertion,
            hardwareSignature,
            clientData,
            hardwareKey,
            signCount,
            this.#configuration.iosBundleIdentifiers,
            this.#configuration.iOsTeamIdentifier,
            this.#configuration.skipSignatureValidation,
          ),
          TE.orElse((iosErr) =>
            pipe(
              validateAndroidAssertion(
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
              TE.mapLeft(
                (androidErr) =>
                  new IntegrityCheckError([
                    ...getErrorMessages(iosErr),
                    ...getErrorMessages(androidErr),
                  ]),
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
        // First try iOS attestation validation, if it fails try Android attestation validation
        pipe(
          validateiOSAttestation(
            data,
            nonce,
            hardwareKeyTag,
            this.#configuration.iosBundleIdentifiers,
            this.#configuration.iOsTeamIdentifier,
            this.#configuration.appleRootCertificate,
            this.allowDevelopmentEnvironmentForUser(user),
          ),
          TE.orElse((iosErr) =>
            pipe(
              validateAndroidAttestation(
                data,
                nonce,
                this.#configuration.androidBundleIdentifiers,
                this.#configuration.googlePublicKeys,
                this.#configuration.androidCrlUrl,
                this.#configuration.httpRequestTimeout,
              ),
              TE.mapLeft(toIntegrityCheckError),
              TE.mapLeft(
                (androidErr) =>
                  new IntegrityCheckError([
                    ...getErrorMessages(iosErr),
                    ...getErrorMessages(androidErr),
                  ]),
              ),
            ),
          ),
        ),
      ),
    );
}
export { ValidatedAttestation };
