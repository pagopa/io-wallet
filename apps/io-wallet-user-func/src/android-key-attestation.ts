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

const validateChain = async (
  walletInstance: WalletInstance,
  androidCrlUrl: string,
) => {
  if (
    walletInstance.deviceDetails &&
    walletInstance.deviceDetails.platform === "android" &&
    walletInstance.deviceDetails.x509Chain
  ) {
    const x509Chain = walletInstance.deviceDetails.x509Chain.map(
      (cert) => new X509Certificate(cert),
    );
    await validateRevocation(x509Chain, androidCrlUrl, 4000);
  }
};

const validateAttestedKeyAndRevoke =
  (androidCrlUrl: string, walletInstanceRepository: WalletInstanceRepository) =>
  (walletInstance: WalletInstance) => {
    console.log(walletInstance.userId);
    return pipe(
      TE.tryCatch(
        () => validateChain(walletInstance, androidCrlUrl),
        E.toError,
      ),
      TE.fold(
        () =>
          revokeUserWalletInstances(walletInstance.userId, [walletInstance.id])(
            { walletInstanceRepository },
          ),
        () => TE.right(undefined),
      ),
    );
  };

const fetchAndCheckAllWalletInstancesKey = (
  walletInstanceRepository: WalletInstanceRepository,
  attestationServiceConfiguration: AttestationServiceConfiguration,
  continuationToken?: string,
): TE.TaskEither<Error, void> =>
  pipe(
    walletInstanceRepository.getAllActive({
      continuationToken,
      maxItemCount: 3,
    }),
    TE.chain(
      O.fold(
        () => TE.right(undefined),
        ({ continuationToken: newToken, walletInstances }) =>
          pipe(
            TE.fromIO(() =>
              pipe(
                walletInstances,
                RA.map(
                  validateAttestedKeyAndRevoke(
                    attestationServiceConfiguration.androidCrlUrl,
                    walletInstanceRepository,
                  ),
                ),
              ),
            ),
            TE.chain(() =>
              O.isSome(O.fromNullable(newToken))
                ? fetchAndCheckAllWalletInstancesKey(
                    walletInstanceRepository,
                    attestationServiceConfiguration,
                    newToken,
                  )
                : TE.right(undefined),
            ),
          ),
      ),
    ),
  );

export const checkWalletInstancesAttestedKeyRevocation: RTE.ReaderTaskEither<
  {
    attestationServiceConfiguration: AttestationServiceConfiguration;
    walletInstanceRepository: WalletInstanceRepository;
  },
  Error,
  void
> = ({ attestationServiceConfiguration, walletInstanceRepository }) =>
  fetchAndCheckAllWalletInstancesKey(
    walletInstanceRepository,
    attestationServiceConfiguration,
  );
