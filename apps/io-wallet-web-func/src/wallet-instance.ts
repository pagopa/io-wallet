import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
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

const WalletInstanceValid = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(false),
  }),
]);

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
  getAllByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance[]>>;
  getLastByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
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
