import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as t from "io-ts";

import { EntityNotFoundError } from "./error";
import { JwkPublicKey } from "./jwk";
import { User } from "./user";

class RevokedWalletInstance extends Error {
  name = "WalletInstanceRevoked";
  constructor() {
    super("The wallet instance has been revoked.");
  }
}

const WalletInstanceBase = t.type({
  createdAt: IsoDateFromString,
  hardwareKey: JwkPublicKey,
  id: NonEmptyString,
  signCount: t.number,
  userId: User.props.id,
});

const WalletInstanceValid = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(false),
  }),
]);

export type WalletInstanceValid = t.TypeOf<typeof WalletInstanceValid>;

const WalletInstanceRevoked = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(true),
    revokedAt: IsoDateFromString,
  }),
]);

export const WalletInstance = t.union([
  WalletInstanceValid,
  WalletInstanceRevoked,
]);

export type WalletInstance = t.TypeOf<typeof WalletInstance>;

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

interface WalletInstanceEnvironment {
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
