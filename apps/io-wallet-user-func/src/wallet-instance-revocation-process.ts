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
import { WalletInstanceRevocationStorageQueue } from "./infra/azure/queue/wallet-instance-revocation";
import {
  WalletInstanceRepository,
  revokeUserWalletInstances,
} from "./wallet-instance";

const needToBeRevoked = async (
  walletInstance: WalletInstanceValidWithAndroidCertificatesChain,
  attestationServiceConfiguration: AttestationServiceConfiguration,
) => {
  const x509Chain = walletInstance.deviceDetails.x509Chain.map(
    (cert) => new X509Certificate(cert),
  );

  try {
    // Validate issuance and expiration of the certificates
    validateIssuance(
      x509Chain,
      attestationServiceConfiguration.googlePublicKey,
    );
    // Validate revocation of the certificates using the provided CRL URL
    await validateRevocation(
      x509Chain,
      attestationServiceConfiguration.androidCrlUrl,
      attestationServiceConfiguration.httpRequestTimeout,
    );
  } catch {
    return true;
  }
  return false;
};

export const checkWalletInstancesAttestedKeyRevocation: (
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
      TE.tryCatch(
        () => needToBeRevoked(walletInstance, attestationServiceConfiguration),
        E.toError,
      ),
      TE.chain((toRevoke) =>
        toRevoke
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
