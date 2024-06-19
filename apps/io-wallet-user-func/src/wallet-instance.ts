import * as t from "io-ts";

import * as O from "fp-ts/Option";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { EntityNotFoundError } from "io-wallet-common/http-response";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { User } from "io-wallet-common/user";

class WalletInstanceRevoked extends Error {
  name = "WalletInstanceRevoked";
  constructor() {
    super("The wallet instance has been revoked.");
  }
}

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
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
  insert: (walletInstance: WalletInstance) => TE.TaskEither<Error, void>;
  batchPatchWithReplaceOperation: (
    operations: Array<{
      id: string;
      path: string;
      value: unknown;
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
      TE.chain(
        TE.fromOption(
          () => new EntityNotFoundError("Wallet instance not found")
        )
      ),
      TE.chain((walletInstance) =>
        walletInstance.isRevoked
          ? TE.left(new WalletInstanceRevoked())
          : TE.right(walletInstance)
      )
    );

export const revokeUserWalletInstancesExceptOne: (
  userId: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"]
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (userId, walletInstanceId) =>
  ({ walletInstanceRepository }) =>
    pipe(
      walletInstanceRepository.getAllByUserId(userId),
      TE.map(
        flow(
          RA.filterMap((walletInstance) =>
            walletInstance.id !== walletInstanceId
              ? O.some(walletInstance.id)
              : O.none
          )
        )
      ),
      TE.chain((walletInstancesId) =>
        walletInstanceRepository.batchPatchWithReplaceOperation(
          walletInstancesId.map((id) => ({
            id,
            path: "/isRevoked",
            value: true,
          })),
          userId
        )
      )
    );
