import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { DeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { WalletInstanceValid } from "io-wallet-common/wallet-instance";

import {
  AssertionValidationConfig,
  toClientData,
  toThumbprint,
  verifyAndroidAssertion,
  verifyIosAssertion,
} from "@/infra/mobile-attestation-service";
import { NonceEnvironment } from "@/nonce";
import { isLoadTestUser } from "@/user";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";

export interface KeyAttestationAssertion extends BaseAssertion {
  keysThumbprints: readonly string[];
}

export type WalletInstanceAssertion = BaseAssertion;

interface BaseAssertion {
  cnf: {
    jwk: JwkPublicKey;
  };
  /** ANDROID ONLY: the fresh key attestation, the fallback when Play Integrity is not available or fails. */
  hardwareKeyAttestation?: NonEmptyString;
  hardwareKeyTag: NonEmptyString;
  hardwareSignature: NonEmptyString;
  /** Required on iOS, on Android it is the Play Integrity token which may be missing. */
  integrityAssertion?: NonEmptyString;
  nonce: NonEmptyString;
  platform: "android" | "ios";
}

const validateHardwareAssertion = (input: {
  assertion: BaseAssertion;
  clientData: string;
  deviceDetails?: DeviceDetails;
  hardwareKey: JwkPublicKey;
  signCount: number;
  user: FiscalCode;
}): RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  Error,
  void
> =>
  input.assertion.platform === "ios"
    ? verifyIosAssertion({
        clientData: input.clientData,
        hardwareKey: input.hardwareKey,
        hardwareSignature: input.assertion.hardwareSignature,
        integrityAssertion: input.assertion.integrityAssertion,
        signCount: input.signCount,
      })
    : verifyAndroidAssertion({
        clientData: input.clientData,
        deviceDetails: input.deviceDetails,
        hardwareKey: input.hardwareKey,
        hardwareKeyAttestation: input.assertion.hardwareKeyAttestation,
        hardwareSignature: input.assertion.hardwareSignature,
        integrityAssertion: input.assertion.integrityAssertion,
        user: input.user,
      });

const validateWalletInstanceAssertion: (
  assertion: WalletInstanceAssertion,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
  deviceDetails?: DeviceDetails,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  Error,
  void
> = (assertion, hardwareKey, signCount, user, deviceDetails) =>
  pipe(
    assertion.cnf.jwk,
    toThumbprint,
    RTE.fromTaskEither,
    RTE.chainW((thumbprint) =>
      pipe(
        {
          challenge: assertion.nonce,
          thumbprint,
        },
        toClientData,
        RTE.fromTaskEither,
        RTE.chainW((clientData) =>
          validateHardwareAssertion({
            assertion,
            clientData,
            deviceDetails,
            hardwareKey,
            signCount,
            user,
          }),
        ),
      ),
    ),
  );

const validateKeyAttestationAssertion: (
  assertion: KeyAttestationAssertion,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
  deviceDetails?: DeviceDetails,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  Error,
  void
> = (assertion, hardwareKey, signCount, user, deviceDetails) =>
  pipe(
    {
      challenge: assertion.nonce,
      keysThumbprints: assertion.keysThumbprints,
    },
    toClientData,
    RTE.fromTaskEither,
    RTE.chainW((clientData) =>
      validateHardwareAssertion({
        assertion,
        clientData,
        deviceDetails,
        hardwareKey,
        signCount,
        user,
      }),
    ),
  );

const consumeNonceAndGetValidWalletInstance = (input: {
  hardwareKeyTag: NonEmptyString;
  nonce: NonEmptyString;
  userId: FiscalCode;
}): RTE.ReaderTaskEither<
  NonceEnvironment & WalletInstanceEnvironment,
  Error,
  WalletInstanceValid
> =>
  pipe(
    input.nonce,
    consumeNonce,
    RTE.chainW(() =>
      getValidWalletInstanceByUserId(input.hardwareKeyTag, input.userId),
    ),
  );

export const validateWalletInstanceAssertionRequest: (input: {
  assertion: WalletInstanceAssertion;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  void
> = ({ assertion, userId }) =>
  pipe(
    consumeNonceAndGetValidWalletInstance({
      hardwareKeyTag: assertion.hardwareKeyTag,
      nonce: assertion.nonce,
      userId,
    }),
    RTE.chainW(({ deviceDetails, hardwareKey, signCount }) =>
      isLoadTestUser(userId)
        ? RTE.right(undefined)
        : validateWalletInstanceAssertion(
            assertion,
            hardwareKey,
            signCount,
            userId,
            deviceDetails,
          ),
    ),
  );

export const validateKeyAttestationAssertionAndGetWalletInstance: (input: {
  assertion: KeyAttestationAssertion;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  WalletInstanceValid
> = ({ assertion, userId }) =>
  pipe(
    consumeNonceAndGetValidWalletInstance({
      hardwareKeyTag: assertion.hardwareKeyTag,
      nonce: assertion.nonce,
      userId,
    }),
    RTE.chainFirstW(({ deviceDetails, hardwareKey, signCount }) =>
      isLoadTestUser(userId)
        ? RTE.right(undefined)
        : validateKeyAttestationAssertion(
            assertion,
            hardwareKey,
            signCount,
            userId,
            deviceDetails,
          ),
    ),
  );
