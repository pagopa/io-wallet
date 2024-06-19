import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { User } from "io-wallet-common/user";

const WalletInstanceValid = t.type({
  createdAt: IsoDateFromString,
  hardwareKey: JwkPublicKey,
  id: NonEmptyString,
  isRevoked: t.literal(false),
  signCount: t.number,
  userId: User.props.id,
});

type WalletInstanceValid = t.TypeOf<typeof WalletInstanceValid>;

const WalletInstanceRevoked = t.type({
  createdAt: IsoDateFromString,
  hardwareKey: JwkPublicKey,
  id: NonEmptyString,
  isRevoked: t.literal(true),
  revokedAt: IsoDateFromString,
  signCount: t.number,
  userId: User.props.id,
});

type WalletInstanceRevoked = t.TypeOf<typeof WalletInstanceRevoked>;

export const WalletInstance = t.union([
  WalletInstanceValid,
  WalletInstanceRevoked,
]);

export type WalletInstance = t.TypeOf<typeof WalletInstance>;

export interface WalletInstanceRepository {
  // getAllByUserId: (
  //   userId: WalletInstance["userId"]
  // ) => TE.TaskEither<Error, O.Option<WalletInstance[]>>;
  getAllByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, WalletInstance[]>;
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
      walletInstanceRepository.getAllByUserId(userId),
      TE.map((walletInstances) =>
        walletInstances.reduce(
          (previous, current) =>
            previous.createdAt > current.createdAt ? previous : current,
          walletInstances[0],
        ),
      ),
    );
// pipe(
//   walletInstanceRepository.getAllByUserId(userId),
// TE.chain(
//   TE.fromOption(
//     () => new EntityNotFoundError("There are no wallet instances")
//   )
// )
// );
