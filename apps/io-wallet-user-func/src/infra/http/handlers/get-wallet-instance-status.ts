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

const certificateRevokedByIssuerReason =
  "CERTIFICATE_REVOKED_BY_ISSUER" as const;

type GetAttestationStatusList = () => TE.TaskEither<Error, CRL>;

type WalletInstanceValidId = Pick<WalletInstanceValid, "id" | "isRevoked">;

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

const getX509ChainFromWalletInstance: (
  walletInstance: WalletInstanceValid,
) => E.Either<
  Error,
  {
    x509Chain: readonly X509Certificate[];
  }
> = flow(getAndroidCertificateChain, E.chain(toX509Certificates));

const getAttestationStatusList: () => RTE.ReaderTaskEither<
  { getAttestationStatusList: GetAttestationStatusList },
  Error,
  CRL
> =
  () =>
  ({ getAttestationStatusList }) =>
    getAttestationStatusList();

/**
 * Checks whether any certificate in the provided attestation X.509 chain
 * has been revoked according to Google's attestation status list.
 * Returns { success: true } if none are revoked.
 */
const checkAttestationRevocation = ({
  attestationStatusList,
  x509Chain,
}: {
  attestationStatusList: CRL;
  x509Chain: readonly X509Certificate[];
}): E.Either<Error, ValidationResult> =>
  E.tryCatch(
    () => validateRevocation(x509Chain, attestationStatusList),
    E.toError,
  );

const sendCustomEvent: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RE.ReaderEither<
  { telemetryClient: appInsights.TelemetryClient },
  Error,
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
              reason: certificateRevokedByIssuerReason,
              walletInstanceId: walletInstanceId,
            },
          })({ telemetryClient }),
        E.toError,
      ),
    );

const revokeWalletInstanceAndSendEvent: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  never,
  WalletInstanceRevocationDetails | WalletInstanceValidId
> =
  (walletInstance) =>
  ({ telemetryClient, walletInstanceRepository }) =>
    pipe(
      {
        walletInstanceRepository,
      },
      revokeWalletInstance({
        revocationReason: certificateRevokedByIssuerReason,
        ...walletInstance,
      }),
      TE.chainFirstW(() =>
        pipe(
          sendCustomEvent(
            walletInstance.userId,
            walletInstance.id,
          )({ telemetryClient }),
          // fire and forget
          E.fold(
            () => E.right(undefined),
            () => E.right(undefined),
          ),
          TE.fromEither,
        ),
      ),
      TE.map(() => ({
        id: walletInstance.id,
        isRevoked: true as const,
        revocationReason: certificateRevokedByIssuerReason,
      })),
      // If revokeWalletInstance fails, just ignore the error
      TE.orElseW(() =>
        TE.right({
          id: walletInstance.id,
          isRevoked: false,
        }),
      ),
    );

const revokeWalletInstanceIfCertificateRevoked: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    getAttestationStatusList: GetAttestationStatusList;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  never,
  WalletInstanceRevocationDetails | WalletInstanceValidId
> = (walletInstance) =>
  pipe(
    walletInstance,
    getX509ChainFromWalletInstance,
    RTE.fromEither,
    RTE.bind("attestationStatusList", getAttestationStatusList),
    RTE.chainW(flow(checkAttestationRevocation, RTE.fromEither)),
    RTE.chainW((result) =>
      result.success
        ? RTE.right({ id: walletInstance.id, isRevoked: false })
        : revokeWalletInstanceAndSendEvent(walletInstance),
    ),
    // If anything fails, just ignore the error
    RTE.orElseW(() =>
      RTE.right({
        id: walletInstance.id,
        isRevoked: false,
      }),
    ),
  );

const toWalletInstanceStatusApiModel = (
  walletInstanceRevocationDetails:
    | WalletInstanceRevocationDetails
    | WalletInstanceValidId,
) => ({
  id: walletInstanceRevocationDetails.id,
  is_revoked: walletInstanceRevocationDetails.isRevoked,
  ...("revocationReason" in walletInstanceRevocationDetails
    ? { revocation_reason: walletInstanceRevocationDetails.revocationReason }
    : {}),
});

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
            ? RTE.right({
                id: walletInstance.id,
                isRevoked: walletInstance.isRevoked,
                revocationReason: walletInstance.revocationReason,
              })
            : revokeWalletInstanceIfCertificateRevoked(walletInstance),
        ),
        RTE.map(toWalletInstanceStatusApiModel),
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
