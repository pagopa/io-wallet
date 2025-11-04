import * as H from "@pagopa/handler-kit";
import { X509Certificate } from "crypto";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import { flow, identity, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import * as RT from "fp-ts/ReaderTask";
import { EntityNotFoundError } from "io-wallet-common/error";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import {
  WalletInstance,
  WalletInstanceValid,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

import { ValidationResult } from "@/attestation-service";
import { CRL, validateRevocation } from "@/certificates";
import { requireFiscalCodeFromHeader } from "@/infra/http/fiscal-code";
import { requireWalletInstanceId } from "@/infra/http/wallet-instance";
import {
  sendTelemetryCustomEvent,
  sendTelemetryException,
} from "@/infra/telemetry";
import {
  getWalletInstanceByUserId,
  revokeWalletInstance,
  WalletInstanceRepository,
  WalletInstanceRevocationDetails,
} from "@/wallet-instance";

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
) => E.Either<Error, void> = (userId, walletInstanceId) =>
  sendTelemetryCustomEvent({
    name: "REVOKED_WALLET_INSTANCE_FOR_REVOKED_OR_INVALID_CERTIFICATE",
    properties: {
      fiscalCode: userId,
      reason: certificateRevokedByIssuerReason,
      walletInstanceId: walletInstanceId,
    },
  });

const revokeWalletInstanceAndSendEvent: (
  walletInstance: WalletInstanceValid,
) => RT.ReaderTask<
  {
    walletInstanceRepository: WalletInstanceRepository;
  },
  WalletInstanceRevocationDetails | WalletInstanceValidId
> =
  (walletInstance) =>
  ({ walletInstanceRepository }) =>
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
          sendCustomEvent(walletInstance.userId, walletInstance.id),
          TE.fromEither,
          TE.fold(
            () => TE.right(undefined),
            () => TE.right(undefined),
          ),
        ),
      ),
      TE.matchW(
        () => ({ id: walletInstance.id, isRevoked: false }),
        () => ({
          id: walletInstance.id,
          isRevoked: true,
          revocationReason: certificateRevokedByIssuerReason,
        }),
      ),
    );

const revokeWalletInstanceIfCertificateRevoked: (
  walletInstance: WalletInstanceValid,
) => RT.ReaderTask<
  {
    androidAttestationStatusListCheckFF: boolean;
    getAttestationStatusList: GetAttestationStatusList;
    walletInstanceRepository: WalletInstanceRepository;
  },
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
        : pipe(
            revokeWalletInstanceAndSendEvent,
            RTE.fromReaderTaskK,
          )(walletInstance),
    ),
    RTE.matchW(() => ({ id: walletInstance.id, isRevoked: false }), identity),
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

const androidRevocationCheckFF: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    androidAttestationStatusListCheckFF: boolean;
    getAttestationStatusList: GetAttestationStatusList;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  WalletInstanceRevocationDetails | WalletInstanceValidId
> = (walletInstance) => (dep) =>
  dep.androidAttestationStatusListCheckFF
    ? pipe(
        revokeWalletInstanceIfCertificateRevoked,
        RTE.fromReaderTaskK,
      )(walletInstance)(dep)
    : TE.right({
        id: walletInstance.id,
        isRevoked: false,
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
            : androidRevocationCheckFF(walletInstance),
        ),
        RTE.map(toWalletInstanceStatusApiModel),
        RTE.map(H.successJson),
        RTE.orElseFirstW((error) =>
          error instanceof EntityNotFoundError
            ? RTE.of(void 0)
            : pipe(
                error,
                sendTelemetryException({
                  fiscalCode,
                  functionName: "getWalletInstanceStatus",
                }),
                RTE.fromEither,
              ),
        ),
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
