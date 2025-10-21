import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { EntityNotFoundError } from "io-wallet-common/error";
import {
  RevocationReason,
  WalletInstance,
  WalletInstanceRevoked,
  WalletInstanceValid,
} from "io-wallet-common/wallet-instance";

class RevokedWalletInstance extends Error {
  name = "WalletInstanceRevoked";
  constructor() {
    super("The wallet instance has been revoked.");
  }
}

export const WalletInstanceUserId = t.type({
  id: NonEmptyString,
  userId: FiscalCode,
});

export interface WalletInstanceEnvironment {
  walletInstanceRepository: WalletInstanceRepository;
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
  deleteAllByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, void>;
  getByUserId: (
    id: WalletInstance["id"],
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
  getLastByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
  getUserId: (
    id: WalletInstance["id"],
  ) => TE.TaskEither<Error, O.Option<WalletInstanceUserId>>;
  getValidByUserIdExcludingOne: (
    walletInstanceId: WalletInstance["id"],
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstanceValid[]>>;
  insert: (walletInstance: WalletInstanceValid) => TE.TaskEither<Error, void>;
}

export type WalletInstanceRevocationDetails = Pick<
  WalletInstanceRevoked,
  "id" | "isRevoked" | "revocationReason"
>;

export type WalletInstanceUserId = t.TypeOf<typeof WalletInstanceUserId>;

export const getWalletInstanceByUserId: (
  id: WalletInstance["id"],
  userId: WalletInstance["userId"],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, WalletInstance> =
  (id, userId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.getByUserId(id, userId),
      TE.chain(
        TE.fromOption(
          () => new EntityNotFoundError("Wallet instance not found"),
        ),
      ),
    );

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

export const getWalletInstanceUserId: (
  id: WalletInstance["id"],
) => RTE.ReaderTaskEither<
  WalletInstanceEnvironment,
  Error,
  WalletInstanceUserId
> =
  (id) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.getUserId(id),
      TE.chain(
        TE.fromOption(
          () => new EntityNotFoundError("Wallet instance not found"),
        ),
      ),
    );

export const getValidWalletInstanceByUserId: (
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
      walletInstanceRepository.getByUserId(id, userId),
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

export const revokeUserWalletInstances: (
  userId: WalletInstance["userId"],
  walletInstancesId: readonly WalletInstance["id"][],
  reason: RevocationReason,
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (userId, walletInstancesId, reason) =>
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
              {
                op: "add",
                path: "/revocationReason",
                value: reason,
              },
            ],
          })),
          userId,
        )
      : TE.right(void 0);

export const revokeWalletInstance: (input: {
  reason: RevocationReason;
  userId: WalletInstance["userId"];
  walletInstanceId: WalletInstance["id"];
}) => RTE.ReaderTaskEither<
  { walletInstanceRepository: WalletInstanceRepository },
  Error,
  WalletInstanceRevocationDetails
> =
  ({ reason, userId, walletInstanceId }) =>
  ({ walletInstanceRepository }) =>
    pipe(
      revokeUserWalletInstances(
        userId,
        [walletInstanceId],
        reason,
      )({
        walletInstanceRepository,
      }),
      TE.map(() => ({
        id: walletInstanceId,
        isRevoked: true as const,
        revocationReason: reason,
      })),
    );

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
      walletInstanceRepository.getValidByUserIdExcludingOne(
        walletInstanceId,
        userId,
      ),
      TE.map(
        O.fold(
          () => [],
          flow(RA.filterMap((walletInstance) => O.some(walletInstance.id))),
        ),
      ),
    );

export const revokeUserValidWalletInstancesExceptOne: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
  reason: RevocationReason,
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> = (
  userId,
  walletInstanceId,
  reason,
) =>
  pipe(
    getUserValidWalletInstancesIdExceptOne(userId, walletInstanceId),
    RTE.chain((validWalletInstances) =>
      revokeUserWalletInstances(userId, validWalletInstances, reason),
    ),
  );

export const deleteUserWalletInstances: (
  userId: WalletInstance["userId"],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (userId) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.deleteAllByUserId(userId);
