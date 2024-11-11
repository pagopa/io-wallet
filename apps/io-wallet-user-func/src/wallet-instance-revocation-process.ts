import * as appInsights from "applicationinsights";
import { X509Certificate, createPublicKey } from "crypto";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { WalletInstanceValidWithAndroidCertificatesChain } from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "./app/config";
import { ValidationResult } from "./attestation-service";
import {
  getCrlFromUrl,
  validateIssuance,
  validateRevocation,
} from "./certificates";
import {
  WalletInstanceRepository,
  getValidWalletInstanceWithAndroidCertificatesChain,
  revokeUserWalletInstances,
} from "./wallet-instance";

const validateWalletInstanceCertificatesChain =
  ({
    androidCrlUrl,
    googlePublicKey,
    httpRequestTimeout,
  }: AttestationServiceConfiguration) =>
  (
    walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
  ): TE.TaskEither<Error, ValidationResult> =>
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
                )
              : TE.right(issuanceValidationResult),
          ),
        ),
      ),
    );

export const revokeInvalidWalletInstances: (
  walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
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
              revokeUserWalletInstances(walletInstance.userId, [
                walletInstance.id,
              ])({
                walletInstanceRepository,
              }),
              TE.map(() =>
                telemetryClient.trackEvent({
                  name: "REVOKED_WALLET_INSTANCE_FOR_INVALID_CERTIFICATE",
                  properties: {
                    fiscalCode: walletInstance.userId,
                    reason: validationResult.reason,
                    walletInstanceId: walletInstance.id,
                  },
                }),
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
