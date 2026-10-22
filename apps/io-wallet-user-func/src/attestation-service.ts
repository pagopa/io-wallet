import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { DeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { WalletAttestationRequest } from "./wallet-attestation-request";
import { WalletInstanceRequest } from "./wallet-instance-request";

export interface AttestationService {
  getHardwarePublicTestKey: () => TE.TaskEither<Error, JwkPublicKey>;
  validateAndroidAssertion: (
    request: ValidateAssertionRequest,
  ) => TE.TaskEither<Error, void>;
  validateAssertion: (
    request: ValidateAssertionRequest,
  ) => TE.TaskEither<Error, void>;
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString,
    user: FiscalCode,
  ) => TE.TaskEither<Error, ValidatedAttestation>;
  validateIosAssertion: (
    request: ValidateAssertionRequest,
  ) => TE.TaskEither<Error, void>;
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

export interface ValidatedAttestation {
  deviceDetails: DeviceDetails;
  hardwareKey: JwkPublicKey;
}

export type ValidationResult =
  | { reason: string; success: false }
  | { success: true };

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
  platform?: DeviceDetails["platform"],
) => RTE.ReaderTaskEither<
  { attestationService: AttestationService },
  Error,
  void
> =
  (walletAttestationRequest, hardwareKey, signCount, user, platform) =>
  ({ attestationService }) =>
    pipe(
      {
        hardwareKey,
        hardwareSignature: walletAttestationRequest.payload.hardware_signature,
        integrityAssertion:
          walletAttestationRequest.payload.integrity_assertion,
        jwk: walletAttestationRequest.payload.cnf.jwk,
        nonce: walletAttestationRequest.payload.nonce,
        signCount,
        user,
      },
      platform === "ios"
        ? attestationService.validateIosAssertion
        : platform === "android"
          ? attestationService.validateAndroidAssertion
          : attestationService.validateAssertion,
    );
