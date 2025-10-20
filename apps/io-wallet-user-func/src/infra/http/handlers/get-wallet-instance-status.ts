import * as H from "@pagopa/handler-kit";
import * as appInsights from "applicationinsights";
import { X509Certificate } from "crypto";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import * as RE from "fp-ts/ReaderEither";
import {
  sendTelemetryEvent,
  sendTelemetryException,
} from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import {
  WalletInstance,
  WalletInstanceValid,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "@/app/config";
import { ValidationResult } from "@/attestation-service";
import { CRL, getCrlFromUrls, validateRevocation } from "@/certificates";
import {
  getWalletInstanceByUserId,
  revokeWalletInstance,
  WalletInstanceRepository,
} from "@/wallet-instance";

import { WalletInstanceToStatusApiModel } from "../encoders/wallet-instance";
import { requireFiscalCodeFromHeader } from "../fiscal-code";
import { requireWalletInstanceId } from "../wallet-instance";

const revocationReason = "CERTIFICATE_REVOKED_BY_ISSUER";

const getAndroidCertificateChain = (
  walletInstance: WalletInstanceValid,
): E.Either<Error, readonly string[]> =>
  pipe(
    WalletInstanceValidWithAndroidCertificatesChain.decode(walletInstance),
    E.mapLeft(() => new Error()),
    E.map((wi) => wi.deviceDetails.x509Chain),
  );

const toX509Certificates = (
  chain: readonly string[],
): E.Either<Error, { x509Chain: readonly X509Certificate[] }> =>
  pipe(
    chain,
    RA.traverse(E.Applicative)((cert) =>
      E.tryCatch(() => new X509Certificate(cert), E.toError),
    ),
    E.map((x509Chain) => ({ x509Chain })),
  );

const validateCertificateChainRevocation = ({
  googleCrl,
  x509Chain,
}: {
  googleCrl: CRL;
  x509Chain: readonly X509Certificate[];
}): TE.TaskEither<Error, ValidationResult> =>
  TE.tryCatch(() => validateRevocation(x509Chain, googleCrl), E.toError);

const getX509ChainFromWalletInstance: (
  walletInstance: WalletInstanceValid,
) => E.Either<
  Error,
  {
    x509Chain: readonly X509Certificate[];
  }
> = flow(getAndroidCertificateChain, E.chain(toX509Certificates));

const getCrl: RTE.ReaderTaskEither<
  { attestationServiceConfiguration: AttestationServiceConfiguration },
  Error,
  CRL
> = ({
  attestationServiceConfiguration: { androidCrlUrls, httpRequestTimeout },
}) => getCrlFromUrls(androidCrlUrls, httpRequestTimeout);

const sendCustomEvent: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RE.ReaderEither<
  { telemetryClient: appInsights.TelemetryClient },
  never,
  void
> =
  (userId, walletInstanceId) =>
  ({ telemetryClient }) =>
    pipe(
      E.tryCatch(
        () =>
          sendTelemetryEvent({
            name: "REVOKED_WALLET_INSTANCE_FOR_REVOKED_OR_INVALID_CERTIFICATE",
            properties: {
              fiscalCode: userId,
              reason: revocationReason,
              walletInstanceId: walletInstanceId,
            },
          })({ telemetryClient }),
        E.toError,
      ),
      // fire and forget
      E.fold(
        () => E.right(undefined),
        () => E.right(undefined),
      ),
    );

// If revocation validation fails, the Wallet Instance is revoked, telemetry is sent to App Insights, a Slack alert is triggered
const revokeWalletInstanceAndSendEvent: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  void
> =
  (walletInstance) =>
  ({ telemetryClient, walletInstanceRepository }) =>
    pipe(
      revokeWalletInstance({
        reason: revocationReason,
        userId: walletInstance.userId,
        walletInstanceId: walletInstance.id,
      })({
        walletInstanceRepository,
      }),
      TE.chainW(() =>
        pipe(
          sendCustomEvent(
            walletInstance.userId,
            walletInstance.id,
          )({ telemetryClient }),
          TE.fromEither,
        ),
      ),
    );

const revokeWalletInstanceIfCertificateRevoked: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  never,
  WalletInstance
> = (walletInstance) =>
  pipe(
    walletInstance,
    getX509ChainFromWalletInstance,
    RTE.fromEither,
    RTE.bind("googleCrl", () => getCrl),
    RTE.chainW(flow(validateCertificateChainRevocation, RTE.fromTaskEither)),
    RTE.chainW((result) =>
      result.success
        ? RTE.right(undefined)
        : pipe(walletInstance, revokeWalletInstanceAndSendEvent),
    ),
    RTE.chain(() =>
      RTE.right({
        ...walletInstance,
        isRevoked: true,
        revocationReason,
        revokedAt: new Date(),
      } as const),
    ),
    // If anything fails, just ignore the error
    RTE.orElseW(() => RTE.right(walletInstance)),
  );

export const GetWalletInstanceStatusHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(E.Apply)({
      fiscalCode: pipe(req, requireFiscalCodeFromHeader),
      walletInstanceId: pipe(req, requireWalletInstanceId),
    }),
    RTE.fromEither,
    RTE.chainW(({ fiscalCode, walletInstanceId }) =>
      pipe(
        getWalletInstanceByUserId(walletInstanceId, fiscalCode),
        RTE.chain((walletInstance) =>
          walletInstance.isRevoked
            ? RTE.right(walletInstance)
            : revokeWalletInstanceIfCertificateRevoked(walletInstance),
        ),
        RTE.map(WalletInstanceToStatusApiModel.encode),
        RTE.map(H.successJson),
        RTE.orElseFirstW((error) =>
          pipe(
            sendTelemetryException(error, {
              fiscalCode,
              functionName: "getWalletInstanceStatus",
            }),
            RTE.fromReader,
          ),
        ),
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
