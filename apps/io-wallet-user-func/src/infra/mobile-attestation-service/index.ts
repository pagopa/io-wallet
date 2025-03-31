import { AttestationServiceConfiguration } from "@/app/config";
import {
  AttestationService,
  ValidateAssertionRequest,
  ValidatedAttestation,
} from "@/attestation-service";
import { ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createPublicKey } from "crypto";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { identity, pipe } from "fp-ts/function";
import { Separated } from "fp-ts/lib/Separated";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";
import * as jose from "jose";

import {
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";

class IntegrityCheckError extends Error {
  name = "IntegrityCheckError";
  constructor(msg: string[]) {
    super(msg.join(" | "));
  }
}

const getErrorsOrFirstValidValue = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validated: Separated<readonly Error[], readonly any[]>,
) =>
  pipe(
    validated.right,
    RA.head,
    E.fromOption(
      () => new IntegrityCheckError(validated.left.map((el) => el.message)),
    ),
  );

export class MobileAttestationService implements AttestationService {
  #configuration: AttestationServiceConfiguration;

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
        pipe(
          [
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
            validateAndroidAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              this.#configuration.androidBundleIdentifiers,
              this.#configuration.androidPlayStoreCertificateHash,
              this.#configuration.googleAppCredentialsEncoded,
              this.#configuration.androidPlayIntegrityUrl,
              user ? this.allowDevelopmentEnvironmentForUser(user) : false,
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map(getErrorsOrFirstValidValue),
        ),
      ),
    );

  validateAttestation = (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString,
    user: FiscalCode,
  ): TE.TaskEither<Error, ValidatedAttestation> =>
    pipe(
      E.tryCatch(
        () => Buffer.from(attestation, "base64"),
        () => new Error(`Invalid attestation: ${attestation}`),
      ),
      TE.fromEither,
      TE.chainW((data) =>
        pipe(
          [
            validateiOSAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.iosBundleIdentifiers,
              this.#configuration.iOsTeamIdentifier,
              this.#configuration.appleRootCertificate,
              this.allowDevelopmentEnvironmentForUser(user),
            ),
            validateAndroidAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.androidBundleIdentifiers,
              this.#configuration.googlePublicKey,
              this.#configuration.androidCrlUrls,
              this.#configuration.httpRequestTimeout,
            ),
          ],
          RA.wilt(T.ApplicativeSeq)(identity),
          T.map(getErrorsOrFirstValidValue),
        ),
      ),
    );

  constructor(cnf: AttestationServiceConfiguration) {
    this.#configuration = cnf;
  }
}
export { ValidatedAttestation };
