import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/Option";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { validateJwkKid } from "io-wallet-common/jwk";

import { AssertionValidationConfig } from "@/infra/mobile-attestation-service";
import { validateWalletInstanceAssertionRequest } from "@/infra/mobile-attestation-service/assertion-request-validation";
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
    walletSolutionId: NonEmptyString;
    walletSolutionVersion: NonEmptyString;
  }): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    WalletInstanceAttestationData
  > =>
  ({
    certificateRepository,
    federationEntity: { basePath },
    signer,
    walletAttestationConfig: { oauthClientSub },
  }) =>
    pipe(
      "EC",
      signer.getFirstPublicKeyByKty,
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.chain(({ kid }) =>
        pipe(
          certificateRepository.getCertificateChainByKid(kid),
          TE.chain(
            flow(
              O.match(
                () => TE.left(new Error("Certificate chain not found")),
                (chain) => TE.right({ kid, x5c: chain }),
              ),
            ),
          ),
        ),
      ),
      TE.map(({ kid, x5c }) => ({
        jwk: input.cnf.jwk,
        kid,
        oauthClientSub,
        walletProviderName: basePath.href,
        walletSolutionId: input.walletSolutionId,
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
      walletSolutionId: wiaRequest.walletSolutionId,
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
