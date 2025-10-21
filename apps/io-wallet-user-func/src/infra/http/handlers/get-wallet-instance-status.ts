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
import { CRL, validateRevocation } from "@/certificates";
import {
  getWalletInstanceByUserId,
  revokeWalletInstance,
  WalletInstanceRepository,
  WalletInstanceRevocationDetails,
} from "@/wallet-instance";

import { requireFiscalCodeFromHeader } from "../fiscal-code";
import { requireWalletInstanceId } from "../wallet-instance";

const revocationReason = "CERTIFICATE_REVOKED_BY_ISSUER";

export type AndroidCrlConfiguration = Pick<
  AttestationServiceConfiguration,
  "androidCrlUrls" | "httpRequestTimeout"
>;

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
}): E.Either<Error, ValidationResult> =>
  E.tryCatch(() => validateRevocation(x509Chain, googleCrl), E.toError);

const getX509ChainFromWalletInstance: (
  walletInstance: WalletInstanceValid,
) => E.Either<
  Error,
  {
    x509Chain: readonly X509Certificate[];
  }
> = flow(getAndroidCertificateChain, E.chain(toX509Certificates));

type GetAndroidAttestationCrl = () => TE.TaskEither<Error, CRL>;

const getAndroidAttestationCrl: () => RTE.ReaderTaskEither<
  { getAndroidAttestationCrl: GetAndroidAttestationCrl },
  Error,
  CRL
> =
  () =>
  ({ getAndroidAttestationCrl }) =>
    getAndroidAttestationCrl();

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
  WalletInstanceRevocationDetails
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
      TE.chainFirstW(() =>
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
    getAndroidAttestationCrl: GetAndroidAttestationCrl;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  never,
  | Pick<WalletInstanceValid, "id" | "isRevoked">
  | WalletInstanceRevocationDetails
> = (walletInstance) =>
  pipe(
    walletInstance,
    getX509ChainFromWalletInstance,
    RTE.fromEither,
    RTE.bind("googleCrl", getAndroidAttestationCrl),
    RTE.chainW(flow(validateCertificateChainRevocation, RTE.fromEither)),
    RTE.chainW((result) =>
      result.success
        ? RTE.right({ id: walletInstance.id, isRevoked: false })
        : pipe(walletInstance, revokeWalletInstanceAndSendEvent),
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
        // new encoder
        RTE.map((walletInstance) => ({
          id: walletInstance.id,
          is_revoked: walletInstance.isRevoked,
          ...("revocationReason" in walletInstance
            ? { revocation_reason: walletInstance.revocationReason }
            : {}),
        })),
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
