import * as appInsights from "applicationinsights";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { WalletInstance } from "io-wallet-common/wallet-instance";

import { AttestationServiceConfiguration } from "./app/config";
import { validateRevocation } from "./infra/attestation-service/android/attestation";
import {
  WalletInstanceRepository,
  revokeUserWalletInstances,
} from "./wallet-instance";

const validateKeyAttestationChain = async (
  walletInstance: WalletInstance,
  attestationServiceConfiguration: AttestationServiceConfiguration,
) => {
  // Check if device details exist and the platform is Android with a valid x509 chain. For iOS is not necessary.
  if (
    walletInstance.deviceDetails &&
    walletInstance.deviceDetails.platform === "android" &&
    walletInstance.deviceDetails.x509Chain
  ) {
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

const validateAttestedKeyAndRevokeIfNecessary =
  (
    attestationServiceConfiguration: AttestationServiceConfiguration,
    walletInstanceRepository: WalletInstanceRepository,
    telemetryClient: appInsights.TelemetryClient,
  ) =>
  (walletInstance: WalletInstance) =>
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

const fetchAndCheckAllWalletInstancesKeyRevocation = (
  walletInstanceRepository: WalletInstanceRepository,
  attestationServiceConfiguration: AttestationServiceConfiguration,
  telemetryClient: appInsights.TelemetryClient,
  continuationToken?: string,
): TE.TaskEither<Error, void> =>
  pipe(
    walletInstanceRepository.getAllValid({
      continuationToken,
      maxItemCount: 50,
    }),
    TE.chain(
      O.fold(
        () => TE.right(undefined), // Return early if there are no wallet instances
        ({ continuationToken: newToken, walletInstances }) =>
          pipe(
            walletInstances,
            // Map each wallet instance to its validation function
            RA.map(
              validateAttestedKeyAndRevokeIfNecessary(
                attestationServiceConfiguration,
                walletInstanceRepository,
                telemetryClient,
              ),
            ),
            // Execute all TaskEithers in sequence, collecting results
            RA.sequence(TE.ApplicativeSeq),
            TE.chain(
              () =>
                // Check if there is a continuation token for pagination
                O.isSome(O.fromNullable(newToken))
                  ? fetchAndCheckAllWalletInstancesKeyRevocation(
                      walletInstanceRepository,
                      attestationServiceConfiguration,
                      telemetryClient,
                      newToken,
                    ) // Recursive call if there are more instances to fetch
                  : TE.right(undefined), // Finish if no more tokens
            ),
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
> = ({
  attestationServiceConfiguration,
  telemetryClient,
  walletInstanceRepository,
}) =>
  fetchAndCheckAllWalletInstancesKeyRevocation(
    walletInstanceRepository,
    attestationServiceConfiguration,
    telemetryClient,
  );
