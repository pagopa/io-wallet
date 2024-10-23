import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { DeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { AttestationServiceConfiguration } from "./app/configs/config";
import { MobileAttestationService } from "./infra/attestation-service";
import { WalletAttestationRequest } from "./wallet-attestation-request";
import { WalletInstanceRequest } from "./wallet-instance-request";

export enum OperatingSystem {
  android = "Android",
  iOS = "Apple iOS",
}

export interface ValidatedAttestation {
  deviceDetails: DeviceDetails;
  hardwareKey: JwkPublicKey;
}

export interface ValidateAssertionRequest {
  hardwareKey: JwkPublicKey;
  hardwareSignature: NonEmptyString;
  integrityAssertion: NonEmptyString;
  jwk: JwkPublicKey;
  nonce: NonEmptyString;
  signCount: number;
  user: FiscalCode;
}

export interface AttestationService {
  validateAssertion: (
    request: ValidateAssertionRequest,
  ) => TE.TaskEither<Error, void>;
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString,
    user: FiscalCode,
  ) => TE.TaskEither<Error, ValidatedAttestation>;
}

export const validateAttestation: (
  walletInstanceRequest: WalletInstanceRequest,
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
          walletInstanceRequest.hardwareKeyTag,
          walletInstanceRequest.fiscalCode,
        ),
    );

export const validateAssertion: (
  walletAttestationRequest: WalletAttestationRequest,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { attestationServiceConfiguration: AttestationServiceConfiguration },
  Error,
  void
> =
  (walletAttestationRequest, hardwareKey, signCount, user) =>
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
          user,
        }),
    );
