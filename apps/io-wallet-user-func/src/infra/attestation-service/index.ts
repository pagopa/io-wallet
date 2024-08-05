import { AttestationServiceConfiguration } from "@/app/config";
import {
  AttestationService,
  ValidateAssertionRequest,
  ValidatedAttestation,
} from "@/attestation-service";
import { ValidationError } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { identity, pipe } from "fp-ts/function";
import { Separated } from "fp-ts/lib/Separated";
import { calculateJwkThumbprint } from "jose";

import {
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";

class IntegrityCheckError extends Error {
  name = "IntegrityCheckError";
  constructor(msg: string[]) {
    super(msg.join(". "));
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

  validateAssertion = ({
    hardwareKey,
    hardwareSignature,
    integrityAssertion,
    jwk,
    nonce,
    signCount,
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
              this.#configuration.allowDevelopmentEnvironment,
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
              this.#configuration.allowDevelopmentEnvironment,
            ),
            validateAndroidAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.androidBundleIdentifiers,
              this.#configuration.googlePublicKey,
              this.#configuration.androidCrlUrl,
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map(getErrorsOrFirstValidValue),
        ),
      ),
    );

  constructor(cnf: AttestationServiceConfiguration) {
    this.#configuration = cnf;
  }
}
export { ValidatedAttestation };
