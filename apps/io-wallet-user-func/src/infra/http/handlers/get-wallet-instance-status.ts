import * as H from "@pagopa/handler-kit";
import * as appInsights from "applicationinsights";
import { X509Certificate } from "crypto";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { NotificationService } from "io-wallet-common/notification";
import {
  WalletInstanceValid,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "@/app/config";
import { ValidationResult } from "@/attestation-service";
import { CRL, getCrlFromUrls, validateRevocation } from "@/certificates";
import { IntegrityCheckError } from "@/infra/mobile-attestation-service";
import { obfuscatedUserId } from "@/user";
import { getWalletInstanceByUserId } from "@/wallet-instance";
import {
  revokeUserWalletInstances,
  WalletInstanceRepository,
} from "@/wallet-instance";

import { WalletInstanceToStatusApiModel } from "../encoders/wallet-instance";
import { requireFiscalCodeFromHeader } from "../fiscal-code";
import { requireWalletInstanceId } from "../wallet-instance";

const decodeAndroidChain = (
  walletInstance: WalletInstanceValid,
): E.Either<Error, readonly string[]> =>
  pipe(
    WalletInstanceValidWithAndroidCertificatesChain.decode(walletInstance),
    E.mapLeft(
      () =>
        new Error(
          "Invalid wallet instance: missing Android certificates chain",
        ),
    ),
    E.map((wi) => wi.deviceDetails.x509Chain),
  );

// name
const parseCertificates = (
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
> = flow(decodeAndroidChain, E.chain(parseCertificates));

const getCrl: RTE.ReaderTaskEither<
  { attestationServiceConfiguration: AttestationServiceConfiguration },
  Error,
  CRL
> = ({
  attestationServiceConfiguration: { androidCrlUrls, httpRequestTimeout },
}) => getCrlFromUrls(androidCrlUrls, httpRequestTimeout);

// If revocation validation fails, the Wallet Instance is revoked, telemetry is sent to App Insights, a Slack alert is triggered
const revokeWalletInstanceAndNotify: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    notificationService: NotificationService;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  void
> =
  (walletInstance) =>
  ({ notificationService, telemetryClient, walletInstanceRepository }) =>
    pipe(
      revokeUserWalletInstances(
        walletInstance.userId,
        [walletInstance.id],
        "CERTIFICATE_REVOKED_BY_ISSUER", // centralize
      )({
        walletInstanceRepository,
      }),
      TE.chainW(() =>
        pipe(
          E.tryCatch(
            () =>
              telemetryClient.trackEvent({
                name: "REVOKED_WALLET_INSTANCE_FOR_REVOKED_OR_INVALID_CERTIFICATE",
                properties: {
                  fiscalCode: walletInstance.userId,
                  reason: "CERTIFICATE_REVOKED_BY_ISSUER",
                  walletInstanceId: walletInstance.id,
                },
              }),
            E.toError,
          ),
          // fire and forget
          E.fold(
            () => E.right(undefined),
            () => E.right(undefined),
          ),
          TE.fromEither,
        ),
      ),
      TE.chainW(() =>
        pipe(
          notificationService.sendMessage(
            `Revoked Wallet Instance with id: *${walletInstance.id}*.\n
            UserId: ${obfuscatedUserId(walletInstance.userId)}.\n
            Reason: CERTIFICATE_REVOKED_BY_ISSUER`,
          ),
          // fire and forget
          TE.fold(
            () => TE.right(undefined),
            () => TE.right(undefined),
          ),
        ),
      ),
    );

const foo: (walletInstance: WalletInstanceValid) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    notificationService: NotificationService;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  IntegrityCheckError, // only IntegrityCheckError is relevant; other failures are ignored. IntegrityCheckError?
  void
> = (walletInstance) =>
  pipe(
    walletInstance,
    getX509ChainFromWalletInstance,
    RTE.fromEither,
    RTE.bind("googleCrl", () => getCrl),
    RTE.chainW(flow(validateCertificateChainRevocation, RTE.fromTaskEither)),
    // If anything fails, just ignore the error
    // If validation was skipped or successful, do nothing.
    // If validation failed (not skipped), trigger the revocation flow.
    RTE.orElseW(() => RTE.right(undefined)),
    RTE.chain((result) =>
      result === undefined || result.success
        ? RTE.right(undefined)
        : pipe(
            walletInstance,
            revokeWalletInstanceAndNotify,
            RTE.mapLeft(() => new IntegrityCheckError([])),
          ),
    ),
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
        RTE.chainFirst((walletInstance) =>
          !walletInstance.isRevoked
            ? foo(walletInstance)
            : RTE.right(undefined),
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
