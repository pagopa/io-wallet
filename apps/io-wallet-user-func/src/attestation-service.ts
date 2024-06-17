import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

import { AttestationServiceConfiguration } from "./app/config";
import { MobileAttestationService } from "./infra/attestation-service";
import { JwkPublicKey } from "./jwk";
import { WalletAttestationRequest } from "./wallet-attestation-request";
import { WalletInstanceRequest } from "./wallet-instance-request";

export enum OperatingSystem {
  android = "Android",
  iOS = "Apple iOS",
}

export interface ValidatedAttestation {
  hardwareKey: JwkPublicKey;
}

export interface ValidateAssertionRequest {
  hardwareKey: JwkPublicKey;
  hardwareSignature: NonEmptyString;
  integrityAssertion: NonEmptyString;
  jwk: JwkPublicKey;
  nonce: NonEmptyString;
  signCount: number;
}

export interface AttestationService {
  validateAssertion: (
    request: ValidateAssertionRequest
  ) => TE.TaskEither<Error, void>;
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ) => TE.TaskEither<Error, ValidatedAttestation>;
}

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

export const validateAssertion: (
  walletAttestationRequest: WalletAttestationRequest,
  hardwareKey: JwkPublicKey,
  signCount: number
) => RTE.ReaderTaskEither<
  { attestationServiceConfiguration: AttestationServiceConfiguration },
  Error,
  void
> =
  (walletAttestationRequest, hardwareKey, signCount) =>
  ({ attestationServiceConfiguration }) =>
    pipe(
      new MobileAttestationService(attestationServiceConfiguration),
      (attestationService) =>
        attestationService.validateAssertion({
          hardwareKey,
          hardwareSignature:
            walletAttestationRequest.payload.hardware_signature,
          integrityAssertion:
            walletAttestationRequest.payload.integrity_assertion,
          jwk: walletAttestationRequest.payload.cnf.jwk,
          nonce: walletAttestationRequest.payload.challenge,
          signCount,
        })
    );
