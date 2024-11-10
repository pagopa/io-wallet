import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { EntityNotFoundError } from "io-wallet-common/error";
import {
  WalletInstance,
  WalletInstanceValid,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

class RevokedWalletInstance extends Error {
  name = "WalletInstanceRevoked";
  constructor() {
    super("The wallet instance has been revoked.");
  }
}

export interface WalletInstanceRepository {
  batchPatch: (
    operationsInput: {
      id: string;
      operations: {
        op: "add" | "incr" | "remove" | "replace" | "set";
        path: string;
        value: unknown;
      }[];
    }[],
    userId: string,
  ) => TE.TaskEither<Error, void>;
  get: (
    id: WalletInstance["id"],
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
  getAllByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance[]>>;
  getLastByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
  insert: (walletInstance: WalletInstanceValid) => TE.TaskEither<Error, void>;
}

export interface WalletInstanceEnvironment {
  walletInstanceRepository: WalletInstanceRepository;
}

export const getCurrentWalletInstance: (
  userId: WalletInstance["userId"],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, WalletInstance> =
  (userId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.getLastByUserId(userId),
      TE.chain(
        TE.fromOption(
          () => new EntityNotFoundError("Wallet instance not found"),
        ),
      ),
    );

export const insertWalletInstance: (
  walletInstance: WalletInstanceValid,
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (walletInstance) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.insert(walletInstance);

export const getValidWalletInstance: (
  id: WalletInstance["id"],
  userId: WalletInstance["userId"],
) => RTE.ReaderTaskEither<
  WalletInstanceEnvironment,
  Error,
  WalletInstanceValid
> =
  (id, userId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.get(id, userId),
      TE.chain(
        TE.fromOption(
          () => new EntityNotFoundError("Wallet instance not found"),
        ),
      ),
      TE.chain((walletInstance) =>
        walletInstance.isRevoked
          ? TE.left(new RevokedWalletInstance())
          : TE.right(walletInstance),
      ),
    );

export const getValidWalletInstanceWithAndroidCertificatesChain: (
  id: WalletInstance["id"],
  userId: WalletInstance["userId"],
) => RTE.ReaderTaskEither<
  WalletInstanceEnvironment,
  Error,
  WalletInstanceValidWithAndroidCertificatesChain
> = (id, userId) =>
  pipe(
    getValidWalletInstance(id, userId),
    RTE.chainEitherK(
      flow(
        WalletInstanceValidWithAndroidCertificatesChain.decode,
        E.mapLeft(
          () =>
            new Error(
              "Wallet Instance does not have a certificate chain for android",
            ),
        ),
      ),
    ),
  );

export const revokeUserWalletInstances: (
  userId: WalletInstance["userId"],
  walletInstancesId: readonly WalletInstance["id"][],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (userId, walletInstancesId) =>
  ({ walletInstanceRepository }) =>
    walletInstancesId.length
      ? walletInstanceRepository.batchPatch(
          walletInstancesId.map((walletInstanceId) => ({
            id: walletInstanceId,
            operations: [
              {
                op: "replace",
                path: "/isRevoked",
                value: true,
              },
              {
                op: "add",
                path: "/revokedAt",
                value: new Date(),
              },
            ],
          })),
          userId,
        )
      : TE.right(void 0);

const getUserValidWalletInstancesIdExceptOne: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RTE.ReaderTaskEither<
  WalletInstanceEnvironment,
  Error,
  readonly WalletInstanceValid["id"][]
> =
  (userId, walletInstanceId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.getAllByUserId(userId),
      TE.map(
        O.fold(
          () => [],
          flow(
            RA.filterMap((walletInstance) =>
              walletInstance.id !== walletInstanceId &&
              walletInstance.isRevoked === false
                ? O.some(walletInstance.id)
                : O.none,
            ),
          ),
        ),
      ),
    );

export const revokeUserValidWalletInstancesExceptOne: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> = (
  userId,
  walletInstanceId,
) =>
  pipe(
    getUserValidWalletInstancesIdExceptOne(userId, walletInstanceId),
    RTE.chain((validWalletInstances) =>
      revokeUserWalletInstances(userId, validWalletInstances),
    ),
  );

export const filterValidWithAndroidCertificatesChain = (
  walletInstances: WalletInstance[],
): RTE.ReaderTaskEither<
  void,
  Error,
  readonly WalletInstanceValidWithAndroidCertificatesChain[]
> =>
  pipe(
    walletInstances,
    RA.filterMap(
      flow(WalletInstanceValidWithAndroidCertificatesChain.decode, O.getRight),
    ),
    RTE.of,
  );
