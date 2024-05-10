import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { JWK } from "jose";
import { WalletInstanceRequest } from "./wallet-instance-request";
import { AttestationServiceConfiguration } from "./app/config";
import { MobileAttestationService } from "./infra/attestation-service";

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
  hardwareKey: JWK;
  signCount: number;
};

export type AttestationService = {
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ) => TE.TaskEither<Error, ValidatedAttestation>;
  validateAssertion: (
    request: ValidateAssertionRequest
  ) => TE.TaskEither<Error, boolean>;
};

export const validateAttestation: (
  walletInstanceRequest: WalletInstanceRequest
) => RTE.ReaderTaskEither<
  { attestationServiceConfiguration: AttestationServiceConfiguration },
  Error,
  ValidatedAttestation
> =
  (walletInstanceRequest) =>
  ({ attestationServiceConfiguration }) =>
    pipe(
      new MobileAttestationService(attestationServiceConfiguration),
      (attestationService) =>
        attestationService.validateAttestation(
          walletInstanceRequest.keyAttestation,
          walletInstanceRequest.challenge,
          walletInstanceRequest.hardwareKeyTag
        )
    );
