import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import { AttestationService } from "../../attestation-service";
import { AttestationServiceConfiguration } from "../../app/config";
import { valiateiOSAttestation } from "./ios";
import { validateAndroidAttestation } from "./android";

export class MobileAttestationService implements AttestationService {
  #configuration: AttestationServiceConfiguration;

  constructor(cnf: AttestationServiceConfiguration) {
    this.#configuration = cnf;
  }

  validateAttestation = (attestation: NonEmptyString, nonce: NonEmptyString) =>
    pipe(
      E.tryCatch(
        () => Buffer.from(attestation, "base64"),
        () => new Error(`Invalid attestation: ${attestation}`)
      ),
      E.chainW((data) =>
        pipe(
          [
            valiateiOSAttestation(data, nonce),
            validateAndroidAttestation(data, nonce),
          ],
          RA.separate,
          (validated) =>
            pipe(
              validated.right,
              RA.head,
              E.fromOption(() => new Error("No validation passed"))
            )
        )
      ),
      TE.fromEither
    );

  validateAssertion = (assertion: NonEmptyString, nonce: NonEmptyString) =>
    pipe(true, TE.right);
}
