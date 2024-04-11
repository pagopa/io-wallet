import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe, identity } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import { sequenceS } from "fp-ts/lib/Apply";

import {
  AttestationService,
  ValidatedAttestation,
} from "../../attestation-service";
import { AttestationServiceConfiguration } from "../../app/config";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";
import { validateAndroidAttestation } from "./android";

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
              this.#configuration.googlePublicKey
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map((validated) =>
            pipe(
              validated.right,
              RA.head,
              E.fromOption(() => new Error("No validation passed"))
            )
          )
        )
      )
    );

  validateAssertion = (
    assertion: NonEmptyString,
    payload: NonEmptyString,
    _hardwareKeyTag: NonEmptyString
  ): TE.TaskEither<Error, boolean> =>
    pipe(
      sequenceS(TE.ApplicativeSeq)({
        assertionData: pipe(
          E.tryCatch(
            () => Buffer.from(assertion, "base64"),
            () => new Error(`Invalid assertion: ${assertion}`)
          ),
          TE.fromEither
        ),
        // TODO: [SIW-969] Add getting the public hardware key from the DB with keyTag and the signCount
        hardwareKey: TE.left(new Error("Not implemented")),
        signCount: TE.left(new Error("Not implemented")),
      }),
      TE.chain(({ assertionData, hardwareKey, signCount }) =>
        validateiOSAssertion(
          assertionData,
          payload,
          this.#configuration.iOsBundleIdentifier,
          this.#configuration.iOsTeamIdentifier,
          hardwareKey,
          signCount
        )
      )
    );
}
export { ValidatedAttestation };
