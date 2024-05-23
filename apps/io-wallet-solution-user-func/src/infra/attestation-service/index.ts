import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe, identity } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as J from "fp-ts/Json";
import { sequenceS } from "fp-ts/lib/Apply";

import { ValidationError } from "@pagopa/handler-kit";
import { Separated } from "fp-ts/lib/Separated";
import {
  AttestationService,
  ValidatedAttestation,
  ValidateAssertionRequest,
} from "../../attestation-service";
import { AttestationServiceConfiguration } from "../../app/config";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";
import {
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";

const getErrorsOrFirstValidValue = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validated: Separated<ReadonlyArray<Error>, ReadonlyArray<any>>
) =>
  pipe(
    validated.right,
    RA.head,
    E.fromOption(
      () => new ValidationError(validated.left.map((el) => el.message))
    )
  );

export class MobileAttestationService implements AttestationService {
  #configuration: AttestationServiceConfiguration;

  constructor(cnf: AttestationServiceConfiguration) {
    this.#configuration = cnf;
  }

  validateAttestation = (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ): TE.TaskEither<Error, ValidatedAttestation> =>
    pipe(
      E.tryCatch(
        () => Buffer.from(attestation, "base64"),
        () => new Error(`Invalid attestation: ${attestation}`)
      ),
      TE.fromEither,
      TE.chainW((data) =>
        pipe(
          [
            validateiOSAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.iOsBundleIdentifier,
              this.#configuration.iOsTeamIdentifier,
              this.#configuration.appleRootCertificate,
              this.#configuration.allowDevelopmentEnvironment
            ),
            validateAndroidAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.androidBundleIdentifier,
              this.#configuration.googlePublicKey,
              this.#configuration.androidCrlUrl
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map(getErrorsOrFirstValidValue)
        )
      )
    );

  validateAssertion = ({
    integrityAssertion,
    hardwareSignature,
    nonce,
    jwk,
    hardwareKey,
    signCount,
  }: ValidateAssertionRequest) =>
    pipe(
      sequenceS(TE.ApplicativeSeq)({
        clientData: pipe(
          {
            challenge: nonce,
            jwk,
          },
          J.stringify,
          E.mapLeft(() => new ValidationError(["Unable to create clientData"])),
          TE.fromEither
        ),
      }),
      TE.chain(({ clientData }) =>
        pipe(
          [
            validateiOSAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              signCount,
              this.#configuration.iOsBundleIdentifier,
              this.#configuration.iOsTeamIdentifier,
              this.#configuration.skipSignatureValidation
            ),
            validateAndroidAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              this.#configuration.androidBundleIdentifier,
              this.#configuration.androidPlayStoreCertificateHash,
              this.#configuration.googleAppCredentialsEncoded,
              this.#configuration.androidPlayIntegrityUrl,
              this.#configuration.allowDevelopmentEnvironment
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map(getErrorsOrFirstValidValue)
        )
      )
    );
}
export { ValidatedAttestation };