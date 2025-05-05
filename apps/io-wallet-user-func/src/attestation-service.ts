import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { DeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";

import {
  WalletAttestationRequest,
  WalletAttestationRequestV2,
} from "./wallet-attestation-request";
import { WalletInstanceRequest } from "./wallet-instance-request";

export enum OperatingSystem {
  android = "Android",
  iOS = "Apple iOS",
}

export type ValidationResult =
  | { reason: string; success: false }
  | { success: true };

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
  getHardwarePublicTestKey: () => TE.TaskEither<Error, JwkPublicKey>;
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
  { attestationService: AttestationService },
  Error,
  ValidatedAttestation
> =
  (walletInstanceRequest) =>
  ({ attestationService }) =>
    attestationService.validateAttestation(
      walletInstanceRequest.keyAttestation,
      walletInstanceRequest.challenge,
      walletInstanceRequest.hardwareKeyTag,
      walletInstanceRequest.fiscalCode,
    );

export const validateAssertion: (
  walletAttestationRequest: WalletAttestationRequest,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { attestationService: AttestationService },
  Error,
  void
> =
  (walletAttestationRequest, hardwareKey, signCount, user) =>
  ({ attestationService }) =>
    attestationService.validateAssertion({
      hardwareKey,
      hardwareSignature: walletAttestationRequest.payload.hardware_signature,
      integrityAssertion: walletAttestationRequest.payload.integrity_assertion,
      jwk: walletAttestationRequest.payload.cnf.jwk,
      nonce: walletAttestationRequest.payload.challenge,
      signCount,
      user,
    });

export const validateAssertionV2: (
  walletAttestationRequest: WalletAttestationRequestV2,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { attestationService: AttestationService },
  Error,
  void
> =
  (walletAttestationRequest, hardwareKey, signCount, user) =>
  ({ attestationService }) =>
    attestationService.validateAssertion({
      hardwareKey,
      hardwareSignature: walletAttestationRequest.payload.hardware_signature,
      integrityAssertion: walletAttestationRequest.payload.integrity_assertion,
      jwk: walletAttestationRequest.payload.cnf.jwk,
      nonce: walletAttestationRequest.payload.nonce,
      signCount,
      user,
    });
