import * as appInsights from "applicationinsights";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { WalletInstanceValid } from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "./app/config";
import { validateRevocation } from "./infra/attestation-service/android/attestation";
import {
  WalletInstanceRepository,
  getAllValidWalletInstances,
  revokeUserWalletInstances,
} from "./wallet-instance";

type WalletInstanceValidWithAndroidCertificatesChain = {
  deviceDetails: { platform: string; x509Chain: string[] };
} & WalletInstanceValid;

const hasAndroidCertificatesChain = (
  walletInstance: WalletInstanceValid,
): walletInstance is WalletInstanceValidWithAndroidCertificatesChain =>
  !!walletInstance.deviceDetails &&
  walletInstance.deviceDetails.platform === "android" &&
  !!walletInstance.deviceDetails.x509Chain;

const validateKeyAttestationChain = async (
  walletInstance: WalletInstanceValid,
  attestationServiceConfiguration: AttestationServiceConfiguration,
) => {
  // Check if device details exist and the platform is Android with a valid x509 chain. For iOS is not necessary.
  if (hasAndroidCertificatesChain(walletInstance)) {
    const x509Chain = walletInstance.deviceDetails.x509Chain.map(
      (cert) => new X509Certificate(cert),
    );

    // Validate revocation of the certificates using the provided CRL URL
    await validateRevocation(
      x509Chain,
      attestationServiceConfiguration.androidCrlUrl,
      attestationServiceConfiguration.httpRequestTimeout,
    );
  }
};

const validateAttestedKeyAndRevokeIfNecessary: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  void
> =
  (walletInstance: WalletInstanceValid) =>
  ({
    attestationServiceConfiguration,
    telemetryClient,
    walletInstanceRepository,
  }) =>
    pipe(
      TE.tryCatch(
        () =>
          validateKeyAttestationChain(
            walletInstance,
            attestationServiceConfiguration,
          ),
        E.toError,
      ),
      // If the validation fails, revoke the user's wallet instance
      TE.alt(() =>
        pipe(
          revokeUserWalletInstances(walletInstance.userId, [walletInstance.id])(
            {
              walletInstanceRepository,
            },
          ),
          TE.map(() =>
            telemetryClient.trackEvent({
              name: "REVOKED_WALLET_INSTANCE_FOR_INVALID_CERTIFICATE",
              properties: {
                fiscalCode: walletInstance.userId,
                walletInstanceId: walletInstance.id,
              },
            }),
          ),
        ),
      ),
    );

export const checkWalletInstancesAttestedKeyRevocation: RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    telemetryClient: appInsights.TelemetryClient;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  void
> = (params) =>
  pipe(params, getAllValidWalletInstances, (generator) =>
    TE.tryCatch(async () => {
      for await (const result of generator) {
        pipe(
          result,
          E.fold(
            () => TE.right(undefined),
            (walletInstance) =>
              pipe(
                params,
                validateAttestedKeyAndRevokeIfNecessary(walletInstance),
              ),
          ),
        )(); //Execute TaskEither for each element of the loop
      }
    }, E.toError),
  );
