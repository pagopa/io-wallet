import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";

export enum OperatingSystem {
  iOS = "Apple iOS",
  android = "Android",
}

export type AttestationService = {
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString
  ) => TE.TaskEither<Error, boolean>;
  validateAssertion: (
    assertion: NonEmptyString,
    nonce: NonEmptyString
  ) => TE.TaskEither<Error, boolean>;
};
