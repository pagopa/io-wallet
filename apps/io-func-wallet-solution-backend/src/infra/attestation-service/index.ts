import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe, identity } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";

import {
  AttestationService,
  ValidatedAttestation,
} from "../../attestation-service";
import { AttestationServiceConfiguration } from "../../app/config";
import { validateAndroidAttestation } from "./android";
import { valiateiOSAttestation } from "./ios";

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
            valiateiOSAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.iOsBundleIdentifier,
              this.#configuration.iOsTeamIdentifier,
              this.#configuration.appleRootCertificate,
              this.#configuration.allowDevelopmentEnvironment
            ),
            validateAndroidAttestation(data, nonce),
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

  validateAssertion = (_assertion: NonEmptyString, _nonce: NonEmptyString) =>
    pipe(true, TE.right);
}
export { ValidatedAttestation };
