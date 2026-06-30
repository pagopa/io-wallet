import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { type ECPrivateKeyWithKid } from "io-wallet-common/jwk";
import { type JWTPayload } from "jose";

import { CertificateRepository } from "@/certificates";
import { FederationEntity } from "@/entity-configuration";
import { signJwt } from "@/infra/crypto/signer";
import { AssertionValidationConfig } from "@/infra/mobile-attestation-service";
import { toThumbprint } from "@/infra/mobile-attestation-service";
import { validateWalletInstanceAssertionRequest } from "@/infra/mobile-attestation-service/assertion-request-validation";
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

interface WalletInstanceAttestationEnvironment {
  certificateRepository: CertificateRepository;
  federationEntity: FederationEntity;
  walletAttestationConfig: {
    oauthClientSub: string;
  };
  walletInstanceAttestationSigningKey: ECPrivateKeyWithKid;
}

const signWalletInstanceAttestation =
  ({
    payload,
    x5c,
  }: {
    payload: JWTPayload;
    x5c: string[];
  }): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    string
  > =>
  ({ walletInstanceAttestationSigningKey }) =>
    signJwt(walletInstanceAttestationSigningKey)({
      duration: "1h",
      header: {
        alg: "ES256",
        typ: "oauth-client-attestation+jwt",
        x5c,
      },
      payload,
    });

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
    certificateRepository,
    federationEntity: { basePathV13: basePath },
    walletInstanceAttestationSigningKey,
    // walletAttestationConfig: { oauthClientSub },
  }) =>
    pipe(
      TE.Do,
      TE.bindW("sub", () => toThumbprint(input.cnf.jwk)),
      TE.bindW("x5c", () =>
        pipe(
          certificateRepository.getCertificateChainByKid(
            walletInstanceAttestationSigningKey.kid,
          ),
          TE.chain(
            TE.fromOption(() => new Error("Certificate chain not found")),
          ),
        ),
      ),
      TE.map(({ sub, x5c }) => ({
        jwk: input.cnf.jwk,
        kid: walletInstanceAttestationSigningKey.kid,
        sub,
        walletProviderName: basePath.href,
        // walletSolutionVersion: input.walletSolutionVersion,
        x5c,
      })),
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
          signWalletInstanceAttestation({ payload: { ...payload }, x5c }),
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
