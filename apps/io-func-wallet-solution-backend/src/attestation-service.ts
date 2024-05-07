import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { JWK } from "jose";
import { WalletInstanceEnvironment } from "./wallet-instance";

export enum OperatingSystem {
  iOS = "Apple iOS",
  android = "Android",
}

export type ValidatedAttestation = {
  hardwareKey: JWK;
};

export type ValidateAssertionRequest = {
  integrityAssertion: NonEmptyString;
  hardwareSignature: NonEmptyString;
  nonce: NonEmptyString;
  jwk: JWK;
  hardwareKeyTag: NonEmptyString;
  userId: NonEmptyString;
};

export type AttestationService = {
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ) => TE.TaskEither<Error, ValidatedAttestation>;
  validateAssertion: (
    request: ValidateAssertionRequest
  ) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, boolean>;
};
