import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { JwkPublicKey } from "io-wallet-common/jwk";

import {
  AssertionValidationConfig,
  toClientData,
  toThumbprint,
  verifyAndroidAssertion,
  verifyIosAssertion,
} from "@/infra/mobile-attestation-service";
import { NonceEnvironment } from "@/nonce";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";

export type WalletInstanceAssertion = BaseAssertion;

export interface WalletUnitAssertion extends BaseAssertion {
  keysThumbprints: readonly string[];
}

interface BaseAssertion {
  cnf: {
    jwk: JwkPublicKey;
  };
  hardwareKeyTag: NonEmptyString;
  hardwareSignature: NonEmptyString;
  integrityAssertion: NonEmptyString;
  nonce: NonEmptyString;
  platform: "android" | "ios";
}

const validateHardwareAssertion = (input: {
  assertion: BaseAssertion;
  clientData: string;
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
        hardwareKey: input.hardwareKey,
        hardwareSignature: input.assertion.hardwareSignature,
        integrityAssertion: input.assertion.integrityAssertion,
        user: input.user,
      });

const validateWalletInstanceAssertion: (
  assertion: WalletInstanceAssertion,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  Error,
  void
> = (assertion, hardwareKey, signCount, user) =>
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
            hardwareKey,
            signCount,
            user,
          }),
        ),
      ),
    ),
  );

const validateWalletUnitAssertion: (
  assertion: WalletUnitAssertion,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  Error,
  void
> = (assertion, hardwareKey, signCount, user) =>
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
  {
    hardwareKey: JwkPublicKey;
    signCount: number;
  }
> =>
  pipe(
    input.nonce,
    consumeNonce,
    RTE.chainW(() =>
      getValidWalletInstanceByUserId(input.hardwareKeyTag, input.userId),
    ),
    RTE.map(({ hardwareKey, signCount }) => ({
      hardwareKey,
      signCount,
    })),
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
    RTE.chainW(({ hardwareKey, signCount }) =>
      validateWalletInstanceAssertion(
        assertion,
        hardwareKey,
        signCount,
        userId,
      ),
    ),
  );

export const validateWalletUnitAssertionRequest: (input: {
  assertion: WalletUnitAssertion;
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
    RTE.chainW(({ hardwareKey, signCount }) =>
      validateWalletUnitAssertion(assertion, hardwareKey, signCount, userId),
    ),
  );
