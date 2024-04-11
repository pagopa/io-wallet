import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { JWK } from "jose";

export enum OperatingSystem {
  iOS = "Apple iOS",
  android = "Android",
}

export type ValidatedAttestation = {
  hardwareKey: JWK;
};

export type AttestationService = {
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ) => TE.TaskEither<Error, ValidatedAttestation>;
  validateAssertion: (
    assertion: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ) => TE.TaskEither<Error, boolean>;
};
