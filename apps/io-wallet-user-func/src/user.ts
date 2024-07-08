import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { enumType } from "@pagopa/ts-commons/lib/types";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

export const User = t.type({
  id: NonEmptyString,
});

export type User = t.TypeOf<typeof User>;

export interface UserRepository {
  getFiscalCodeByUserId: (
    id: string,
  ) => TE.TaskEither<Error, { fiscalCode: FiscalCode }>;
  getOrCreateUserByFiscalCode: (
    fiscalCode: FiscalCode,
  ) => TE.TaskEither<Error, User>;
}

export interface UserEnvironment {
  userRepository: UserRepository;
}

export const getUserByFiscalCode: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<UserEnvironment, Error, User> =
  (fiscalCode) =>
  ({ userRepository }) =>
    userRepository.getOrCreateUserByFiscalCode(fiscalCode);

export enum SubscriptionStateEnum {
  "ACTIVE" = "ACTIVE",
  "DISABLED" = "DISABLED",
  "SUBSCRIBED" = "SUBSCRIBED",
  "UNSUBSCRIBED" = "UNSUBSCRIBED",
}

const SubscriptionState = t.type({
  state: enumType<SubscriptionStateEnum>(
    SubscriptionStateEnum,
    "SubscriptionState",
  ),
});

export type SubscriptionState = t.TypeOf<typeof SubscriptionState>;

export interface UserTrialSubscriptionRepository {
  featureFlag: string;
  getUserSubscriptionDetail: (
    userId: NonEmptyString,
  ) => TE.TaskEither<Error, SubscriptionState>;
}

export interface UserTrialSubscriptionEnvironment {
  userTrialSubscriptionRepository: UserTrialSubscriptionRepository;
}

const isUserSubscriptionActive: (
  userId: NonEmptyString,
) => RTE.ReaderTaskEither<UserTrialSubscriptionEnvironment, Error, boolean> =
  (userId) =>
  ({
    userTrialSubscriptionRepository: { featureFlag, getUserSubscriptionDetail },
  }) =>
    featureFlag === "true"
      ? pipe(
          userId,
          getUserSubscriptionDetail,
          TE.map(({ state }) => state === "ACTIVE"),
        )
      : TE.right(true);

export const ensureUserInWhitelist: ({
  id,
}: User) => RTE.ReaderTaskEither<
  UserTrialSubscriptionEnvironment,
  Error,
  void
> = ({ id }) =>
  pipe(
    id,
    isUserSubscriptionActive,
    RTE.chain((isActive) =>
      isActive ? RTE.right(undefined) : RTE.left(new Error()),
    ),
  );
