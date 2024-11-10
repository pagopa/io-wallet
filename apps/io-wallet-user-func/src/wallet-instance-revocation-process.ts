import * as appInsights from "applicationinsights";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { WalletInstanceValidWithAndroidCertificatesChain } from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "./app/config";
import {
  validateIssuance,
  validateRevocation,
} from "./infra/attestation-service/android/attestation";
import { ValidationResult } from "./infra/attestation-service/errors";
import { WalletInstanceRevocationStorageQueue } from "./infra/azure/queue/wallet-instance-revocation";
import {
  WalletInstanceRepository,
  getValidWalletInstanceWithAndroidCertificatesChain,
  revokeUserWalletInstances,
} from "./wallet-instance";

const needToBeRevoked = async (
  walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
  attestationServiceConfiguration: AttestationServiceConfiguration,
): Promise<ValidationResult> => {
  const x509Chain = walletInstance.deviceDetails.x509Chain.map(
    (cert) => new X509Certificate(cert),
  );

  const { androidCrlUrl, googlePublicKey, httpRequestTimeout } =
    attestationServiceConfiguration;

  const issuanceValidationResult = validateIssuance(x509Chain, googlePublicKey);

  if (!issuanceValidationResult.success) {
    return issuanceValidationResult;
  }

  const revocationValidationResult = await validateRevocation(
    x509Chain,
    androidCrlUrl,
    httpRequestTimeout,
  );

  return revocationValidationResult;
};

export const revokeInvalidWalletInstances: (
  walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    revocationQueue: WalletInstanceRevocationStorageQueue;
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
      TE.chain((validWalletInstanceWithAndroidCertificatesChain) =>
        TE.tryCatch(
          () =>
            needToBeRevoked(
              validWalletInstanceWithAndroidCertificatesChain,
              attestationServiceConfiguration,
            ),
          E.toError,
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
