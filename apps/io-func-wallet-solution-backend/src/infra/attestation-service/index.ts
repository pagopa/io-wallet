import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe, identity } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as J from "fp-ts/Json";
import { sequenceS } from "fp-ts/lib/Apply";

import { JWK } from "jose";
import {
  AttestationService,
  ValidatedAttestation,
} from "../../attestation-service";
import { AttestationServiceConfiguration } from "../../app/config";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";
import {
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";

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
          T.map((validated) =>
            pipe(
              validated.right,
              RA.head,
              E.fromOption(() => new Error("No attestation validation passed"))
            )
          )
        )
      )
    );

  validateAssertion = (
    integrityAssertion: NonEmptyString,
    hardwareSignature: NonEmptyString,
    nonce: NonEmptyString,
    jwk: JWK,
    _hardwareKeyTag: NonEmptyString
  ): TE.TaskEither<Error, boolean> =>
    pipe(
      sequenceS(TE.ApplicativeSeq)({
        clientData: pipe(
          {
            challenge: nonce,
            jwk,
          },
          J.stringify,
          E.mapLeft(() => new Error("Unable to create clientData")),
          TE.fromEither
        ),
        // TODO: [SIW-969] Add getting the public hardware key from the DB with keyTag and the signCount
        hardwareKey: TE.left(new Error("Not implemented")),
        signCount: TE.left(new Error("Not implemented")),
      }),
      TE.chain(({ clientData, hardwareKey, signCount }) =>
        pipe(
          [
            validateiOSAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              signCount,
              this.#configuration.iOsBundleIdentifier,
              this.#configuration.iOsTeamIdentifier
            ),
            validateAndroidAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              this.#configuration.androidBundleIdentifier,
              this.#configuration.googleAppCredentialsEncoded,
              this.#configuration.androidPlayIntegrityUrl,
              this.#configuration.allowDevelopmentEnvironment
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map((validated) =>
            pipe(
              validated.right,
              RA.head,
              E.fromOption(() => new Error("No assertion validation passed"))
            )
          )
        )
      )
    );
}
export { ValidatedAttestation };
