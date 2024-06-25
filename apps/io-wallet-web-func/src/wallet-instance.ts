import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { EntityNotFoundError } from "io-wallet-common/http-response";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { User } from "io-wallet-common/user";

const WalletInstanceBase = t.type({
  createdAt: IsoDateFromString,
  hardwareKey: JwkPublicKey,
  id: NonEmptyString,
  signCount: t.number,
  userId: User.props.id,
});

export const WalletInstanceValid = t.intersection([
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

const getAllByUserId: (
  userId: WalletInstance["userId"],
) => RTE.ReaderTaskEither<
  WalletInstanceEnvironment,
  Error,
  O.Option<WalletInstance[]>
> =
  (userId) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.getAllByUserId(userId);

const revokeWalletInstance: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (userId, walletInstanceId) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.batchPatch(
      [
        {
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
        },
      ],
      userId,
    );

const getUserWalletInstancesIdExceptOne: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RTE.ReaderTaskEither<
  WalletInstanceEnvironment,
  Error,
  readonly WalletInstance["id"][]
> = (userId, walletInstanceId) =>
  pipe(
    getAllByUserId(userId),
    RTE.map(
      O.fold(
        () => [],
        flow(
          RA.filterMap((walletInstance) =>
            walletInstance.id !== walletInstanceId
              ? O.some(walletInstance.id)
              : O.none,
          ),
        ),
      ),
    ),
  );

const revokeUserWalletInstances: (
  userId: WalletInstance["userId"],
  walletInstancesId: readonly WalletInstance["id"][],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> = (
  userId,
  walletInstancesId,
) =>
  walletInstancesId.length
    ? pipe(
        RA.sequence(RTE.ApplicativePar)(
          walletInstancesId.map((id) => revokeWalletInstance(id, userId)),
        ),
        RTE.map(() => void 0),
      )
    : RTE.right(void 0);

export const revokeUserWalletInstancesExceptOne: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> = (
  userId,
  walletInstanceId,
) =>
  pipe(
    getUserWalletInstancesIdExceptOne(userId, walletInstanceId),
    RTE.chain((walletInstancesId) =>
      revokeUserWalletInstances(userId, walletInstancesId),
    ),
  );
