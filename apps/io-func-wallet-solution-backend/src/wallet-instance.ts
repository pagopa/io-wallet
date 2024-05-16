import * as t from "io-ts";

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { User } from "./user";
import { JwkPublicKey } from "./jwk";

export const WalletInstance = t.type({
  id: NonEmptyString,
  userId: User.props.id,
  hardwareKey: JwkPublicKey,
  signCount: t.number,
  isRevoked: t.boolean,
});

export type WalletInstance = t.TypeOf<typeof WalletInstance>;

export type WalletInstanceRepository = {
  get: (
    id: WalletInstance["id"],
    userId: WalletInstance["userId"]
  ) => TE.TaskEither<Error, WalletInstance>;
  insert: (walletInstance: WalletInstance) => TE.TaskEither<Error, void>;
  batchPatch: (
    operations: Array<{
      id: string;
      path: string;
      value: unknown;
      op: "add" | "replace" | "remove" | "set" | "incr";
    }>,
    userId: string
  ) => TE.TaskEither<Error, void>;
  getAllByUserId: (
    userId: WalletInstance["userId"]
  ) => TE.TaskEither<Error, WalletInstance[]>;
};

type WalletInstanceEnvironment = {
  walletInstanceRepository: WalletInstanceRepository;
};

export const insertWalletInstance: (
  walletInstance: WalletInstance
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (walletInstance) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.insert(walletInstance);

export const getValidWalletInstance: (
  id: WalletInstance["id"],
  userId: WalletInstance["userId"]
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, WalletInstance> =
  (id, userId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.get(id, userId),
      TE.chain((walletInstance) =>
        walletInstance.isRevoked
          ? TE.left(new Error("The wallet instance has been revoked"))
          : TE.right(walletInstance)
      )
    );

export const revokeAllWalletInstancesByUserId: (
  userId: WalletInstance["userId"]
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (userId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.getAllByUserId(userId),
      TE.chain((walletInstances) =>
        walletInstanceRepository.batchPatch(
          walletInstances.map((item) => ({
            id: item.id,
            path: "/isRevoked",
            value: true,
            op: "replace",
          })),
          userId
        )
      )
    );
