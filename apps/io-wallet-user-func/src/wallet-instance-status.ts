import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import {
  WalletInstance,
  WalletInstanceRevoked,
} from "io-wallet-common/wallet-instance";

export interface WalletInstanceStatusRepository {
  revoke: (walletInstance: WalletInstanceRevoked) => TE.TaskEither<Error, void>;
  save: (walletInstance: WalletInstance) => TE.TaskEither<Error, void>;
}

export const saveWalletInstanceStatus =
  (
    walletInstance: WalletInstance,
  ): RTE.ReaderTaskEither<
    { walletInstanceStatusRepository: WalletInstanceStatusRepository },
    Error,
    void
  > =>
  ({ walletInstanceStatusRepository }) =>
    walletInstanceStatusRepository.save(walletInstance);

export const revokeWalletInstanceStatus =
  (
    walletInstance: WalletInstanceRevoked,
  ): RTE.ReaderTaskEither<
    { walletInstanceStatusRepository: WalletInstanceStatusRepository },
    Error,
    void
  > =>
  ({ walletInstanceStatusRepository }) =>
    walletInstanceStatusRepository.revoke(walletInstance);
