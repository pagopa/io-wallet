import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { EntityNotFoundError } from "io-wallet-common/error";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { signJwt, SignJwtEnvironment } from "@/infra/crypto/signer";
import {
  AssertionValidationConfig,
  toClientData,
  toThumbprint,
  verifyAndroidAssertion,
  verifyIosAssertion,
} from "@/infra/mobile-attestation-service";
import { getKey, KeyRepository } from "@/keys";
import { NonceRepository } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { WalletInstanceRepository } from "@/wallet-instance";
import { WalletInstanceAttestationToJwtModel } from "@/wallet-instance-attestation";

import {
  requireWalletInstanceAttestationRequest,
  WIARequest,
} from "./wallet-instance-attestation-request";

export interface ParsedWiaRequest {
  userId: FiscalCode;
  wiaRequest: WIARequest;
}

export const runTaskEither = async <A>(
  task: TE.TaskEither<Error, A>,
): Promise<A> => {
  const result = await task();
  if (E.isLeft(result)) {
    throw result.left;
  }
  return result.right;
};

const runReaderTaskEither = async <R, A>(
  task: RTE.ReaderTaskEither<R, Error, A>,
  environment: R,
): Promise<A> => runTaskEither(task(environment));

export const createWalletInstanceAttestationV2Adapters = (input: {
  assertionValidationConfig: AssertionValidationConfig;
  cryptographyClient: SignJwtEnvironment["cryptographyClient"];
  federationEntityId: { href: string };
  keyRepository: KeyRepository;
  nonceRepository: NonceRepository;
  statusListBaseUrl: string;
  walletInstanceAttestationSigningKeyName: string;
  walletInstanceRepository: WalletInstanceRepository;
}) => ({
  clientData: (
    nonce: WIARequest["nonce"],
    thumbprint: string,
  ): Promise<string> =>
    runTaskEither(toClientData({ challenge: nonce, thumbprint })),
  consumeNonce: (nonce: string): Promise<void> =>
    runTaskEither(input.nonceRepository.delete(nonce)),

  encodeAttestation: WalletInstanceAttestationToJwtModel.encode,

  federationEntityId: input.federationEntityId,

  getSigningKey: async () =>
    runReaderTaskEither(getKey(input.walletInstanceAttestationSigningKeyName), {
      keyRepository: input.keyRepository,
    }),

  getWalletInstance: async (
    hardwareKeyTag: WIARequest["hardwareKeyTag"],
    userId: FiscalCode,
  ) => {
    const result = await runTaskEither(
      input.walletInstanceRepository.getByUserId(hardwareKeyTag, userId),
    );
    if (O.isNone(result)) {
      throw new EntityNotFoundError("Wallet instance not found");
    }
    if (result.value.isRevoked) {
      const error = new Error("The wallet instance has been revoked.");
      error.name = "WalletInstanceRevoked";
      throw error;
    }
    return result.value;
  },

  parseRequest: (body: unknown): Promise<ParsedWiaRequest> =>
    runTaskEither(requireWalletInstanceAttestationRequest(body)),

  sendTelemetry: async (body: unknown, error: Error): Promise<void> => {
    const result = sendTelemetryExceptionWithBody({
      body,
      functionName: "createWalletInstanceAttestationV2",
    })(error);
    if (E.isLeft(result)) {
      throw result.left;
    }
  },

  sign: (details: {
    crv: string;
    kid: string;
    payload: unknown;
    x5c: string[];
  }): Promise<string> =>
    runReaderTaskEither(
      signJwt({
        crv: details.crv,
        duration: 60 * 60,
        header: {
          kid: details.kid,
          typ: "oauth-client-attestation+jwt",
          x5c: details.x5c,
        },
        payload: details.payload,
      }),
      { cryptographyClient: input.cryptographyClient },
    ),

  statusListBaseUrl: input.statusListBaseUrl,

  thumbprint: (jwk: JwkPublicKey): Promise<string> =>
    runTaskEither(toThumbprint(jwk)),

  verifyAndroid: (details: {
    clientData: string;
    hardwareKey: JwkPublicKey;
    hardwareSignature: WIARequest["hardwareSignature"];
    integrityAssertion: WIARequest["integrityAssertion"];
    user: FiscalCode;
  }): Promise<void> =>
    runReaderTaskEither(verifyAndroidAssertion(details), {
      assertionValidationConfig: input.assertionValidationConfig,
    }),

  verifyIos: (details: {
    clientData: string;
    hardwareKey: JwkPublicKey;
    hardwareSignature: WIARequest["hardwareSignature"];
    integrityAssertion: WIARequest["integrityAssertion"];
    signCount: number;
  }): Promise<void> =>
    runReaderTaskEither(verifyIosAssertion(details), {
      assertionValidationConfig: input.assertionValidationConfig,
    }),
});
