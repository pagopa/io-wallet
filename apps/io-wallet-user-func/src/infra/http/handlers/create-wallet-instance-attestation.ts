import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { type JWTPayload } from "jose";

import { FederationEntity } from "@/entity-configuration";
import {
  getSignAlgorithmFromCurve,
  signJwt,
  SignJwtEnvironment,
} from "@/infra/crypto/signer";
import { AssertionValidationConfig } from "@/infra/mobile-attestation-service";
import { toThumbprint } from "@/infra/mobile-attestation-service";
import { validateWalletInstanceAssertionRequest } from "@/infra/mobile-attestation-service/assertion-request-validation";
import { getKey, KeyRepository } from "@/keys";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { WalletInstanceEnvironment } from "@/wallet-instance";
import {
  WalletInstanceAttestationData,
  WalletInstanceAttestationToJwtModel,
} from "@/wallet-instance-attestation";

import {
  requireWalletInstanceAttestationRequest,
  WIARequest,
} from "../wallet-instance-attestation-request";

interface WalletInstanceAttestationEnvironment extends SignJwtEnvironment {
  federationEntity: FederationEntity;
  keyRepository: KeyRepository;
  walletAttestationConfig: {
    oauthClientSub: string;
  };
  walletInstanceAttestationSigningKeyName: string;
}

const signWalletInstanceAttestation =
  ({
    crv,
    kid,
    payload,
    x5c,
  }: {
    crv: string;
    kid: string;
    payload: JWTPayload;
    x5c: string[];
  }): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    string
  > =>
  ({ cryptographyClient }) =>
    signJwt({
      crv,
      duration: 60 * 60,
      header: {
        kid,
        typ: "oauth-client-attestation+jwt",
        x5c,
      },
      payload,
    })({ cryptographyClient });

const getWalletInstanceAttestationData =
  (input: {
    cnf: {
      jwk: WIARequest["cnf"]["jwk"];
    };
    // walletSolutionVersion: NonEmptyString;
  }): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    WalletInstanceAttestationData
  > =>
  ({
    federationEntity: { basePathV13: basePath },
    keyRepository,
    walletInstanceAttestationSigningKeyName,
    // walletAttestationConfig: { oauthClientSub },
  }) =>
    pipe(
      { keyRepository },
      getKey(walletInstanceAttestationSigningKeyName),
      TE.chainW((signingKey) =>
        pipe(
          toThumbprint(input.cnf.jwk),
          TE.map((sub) => ({
            crv: signingKey.crv,
            jwk: input.cnf.jwk,
            jwkAlg: getSignAlgorithmFromCurve(input.cnf.jwk.crv),
            kid: signingKey.kid,
            sub,
            walletProviderName: basePath.href,
            // walletSolutionVersion: input.walletSolutionVersion,
            x5c: signingKey.certificateChain,
          })),
        ),
      ),
    );

const testWalletInstanceAttestation =
  "this_is_a_test_wallet_instance_attestation";

const generateWalletInstanceAttestation: (request: {
  userId: FiscalCode;
  wiaRequest: WIARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceAttestationEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  string
> = ({ userId, wiaRequest }) =>
  pipe(
    validateWalletInstanceAssertionRequest({
      assertion: wiaRequest,
      userId,
    }),
    RTE.map(() => ({
      cnf: wiaRequest.cnf,
      // walletSolutionVersion: wiaRequest.walletSolutionVersion,
    })),
    RTE.chainW(getWalletInstanceAttestationData),
    RTE.chainW((walletInstanceAttestationData) =>
      pipe(
        WalletInstanceAttestationToJwtModel.encode(
          walletInstanceAttestationData,
        ),
        ({ x5c, ...payload }) =>
          signWalletInstanceAttestation({
            crv: walletInstanceAttestationData.crv,
            kid: walletInstanceAttestationData.kid,
            payload: { ...payload },
            x5c,
          }),
      ),
    ),
  );

export const CreateWalletInstanceAttestationHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req.body,
      requireWalletInstanceAttestationRequest,
      RTE.fromTaskEither,
      RTE.chain(({ userId, wiaRequest }) =>
        isLoadTestUser(userId)
          ? RTE.right(testWalletInstanceAttestation)
          : generateWalletInstanceAttestation({ userId, wiaRequest }),
      ),
      RTE.map((walletInstanceAttestation) => ({
        wallet_instance_attestation: walletInstanceAttestation,
      })),
      RTE.map(H.successJson),
      RTE.orElseFirstW(
        flow(
          sendTelemetryExceptionWithBody({
            body: req.body,
            functionName: "createWalletInstanceAttestation",
          }),
          RTE.fromEither,
        ),
      ),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
