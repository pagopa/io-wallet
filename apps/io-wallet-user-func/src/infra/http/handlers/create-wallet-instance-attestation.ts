import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { AssertionValidationConfig } from "@/infra/mobile-attestation-service";
import { validateWalletInstanceAssertionRequest } from "@/infra/mobile-attestation-service/assertion-request-validation";
import { getSignerMetadata } from "@/infra/signer-metadata";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { WalletInstanceEnvironment } from "@/wallet-instance";
import {
  createWalletInstanceAttestation,
  WalletInstanceAttestationData,
  WalletInstanceAttestationEnvironment,
} from "@/wallet-instance-attestation";

import {
  requireWalletInstanceAttestationRequest,
  WIARequest,
} from "../wallet-instance-attestation-request";

const getWalletInstanceAttestationData =
  (input: {
    cnf: {
      jwk: WIARequest["cnf"]["jwk"];
    };
    walletSolutionVersion: NonEmptyString;
  }): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    WalletInstanceAttestationData
  > =>
  ({
    federationEntity: { basePath },
    walletAttestationConfig: { oauthClientSub },
    ...signerMetadataEnv
  }) =>
    pipe(
      signerMetadataEnv,
      getSignerMetadata,
      TE.map(({ kid, x5c }) => ({
        jwk: input.cnf.jwk,
        kid,
        oauthClientSub,
        walletProviderName: basePath.href,
        walletSolutionVersion: input.walletSolutionVersion,
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
      walletSolutionVersion: wiaRequest.walletSolutionVersion,
    })),
    RTE.chainW(getWalletInstanceAttestationData),
    RTE.chainW(createWalletInstanceAttestation),
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
