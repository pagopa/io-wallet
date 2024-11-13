import * as appInsights from "applicationinsights";
import { X509Certificate, createPublicKey } from "crypto";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { NotificationService } from "io-wallet-common/notification";
import {
  RevocationReason,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "./app/config";
import {
  getCrlFromUrl,
  validateIssuance,
  validateRevocation,
} from "./certificates";
import { obfuscatedUserId } from "./user";
import {
  WalletInstanceRepository,
  getValidWalletInstanceWithAndroidCertificatesChain,
  revokeUserWalletInstances,
} from "./wallet-instance";

export type ValidationCertificatesResult =
  | { certificatesRevocationReason: RevocationReason; success: false }
  | { success: true };

const validateWalletInstanceCertificatesChain =
  ({
    androidCrlUrl,
    googlePublicKey,
    httpRequestTimeout,
  }: AttestationServiceConfiguration) =>
  (
    walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
  ): TE.TaskEither<Error, ValidationCertificatesResult> =>
    pipe(
      walletInstance.deviceDetails.x509Chain,
      RA.map((cert) => E.tryCatch(() => new X509Certificate(cert), E.toError)),
      RA.sequence(E.Applicative),
      TE.fromEither,
      TE.chain((x509Chain) =>
        pipe(
          E.tryCatch(
            () => validateIssuance(x509Chain, createPublicKey(googlePublicKey)),
            E.toError,
          ),
          TE.fromEither,
          TE.chain((issuanceValidationResult) =>
            issuanceValidationResult.success
              ? pipe(
                  getCrlFromUrl(androidCrlUrl, httpRequestTimeout),
                  TE.chain((attestationCrl) =>
                    TE.tryCatch(
                      () => validateRevocation(x509Chain, attestationCrl),
                      E.toError,
                    ),
                  ),
                  TE.map((validationRevocation) =>
                    validationRevocation.success
                      ? { success: true }
                      : {
                          certificatesRevocationReason:
                            "CERTIFICATE_REVOKED_BY_ISSUER" as RevocationReason,
                          success: false,
                        },
                  ),
                )
              : TE.right({
                  certificatesRevocationReason:
                    "CERTIFICATE_EXPIRED_OR_INVALID" as RevocationReason,
                  success: false,
                }),
          ),
        ),
      ),
    );

export const revokeInvalidWalletInstances: (
  walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    notificationService: NotificationService;
    revocationQueue: WalletInstanceRevocationQueue;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  void
> =
  (walletInstance: WalletInstanceValidWithAndroidCertificatesChain) =>
  ({
    attestationServiceConfiguration,
    notificationService,
    revocationQueue,
    telemetryClient,
    walletInstanceRepository,
  }) =>
    pipe(
      // Get it again from DB because it might have changed
      getValidWalletInstanceWithAndroidCertificatesChain(
        walletInstance.id,
        walletInstance.userId,
      )({
        walletInstanceRepository,
      }),
      TE.chain(
        validateWalletInstanceCertificatesChain(
          attestationServiceConfiguration,
        ),
      ),
      TE.chain((validationResult) =>
        !validationResult.success
          ? pipe(
              revokeUserWalletInstances(
                walletInstance.userId,
                [walletInstance.id],
                validationResult.certificatesRevocationReason,
              )({
                walletInstanceRepository,
              }),
              TE.map(() =>
                telemetryClient.trackEvent({
                  name: "REVOKED_WALLET_INSTANCE_FOR_REVOKED_OR_INVALID_CERTIFICATE",
                  properties: {
                    fiscalCode: walletInstance.userId,
                    reason: validationResult.certificatesRevocationReason,
                    walletInstanceId: walletInstance.id,
                  },
                }),
              ),
              TE.chain(() =>
                pipe(
                  notificationService.sendMessage(
                    `Revoked Wallet Instance with id: *${walletInstance.id}*.\n
                    UserId: ${obfuscatedUserId(walletInstance.userId)}.\n
                    Reason: ${validationResult.certificatesRevocationReason}`,
                  ),
                  TE.map(() => undefined),
                  //Fire and forget
                  TE.alt(() => TE.right(undefined)),
                ),
              ),
              TE.chain(() => TE.right(undefined)),
            )
          : // Re-enter it in the queue for later verification.
            pipe(walletInstance, revocationQueue.insert),
      ),
    );

export interface WalletInstanceRevocationQueue {
  insert: (
    walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
  ) => TE.TaskEither<Error, void>;
}
