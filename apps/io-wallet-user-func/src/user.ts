import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { enumType } from "@pagopa/ts-commons/lib/types";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { EntityNotFoundError } from "io-wallet-common/error";

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
    fiscalCode: FiscalCode,
  ) => TE.TaskEither<Error, SubscriptionState>;
}

export interface UserTrialSubscriptionEnvironment {
  userTrialSubscriptionRepository: UserTrialSubscriptionRepository;
}

const isUserSubscriptionActive: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<UserTrialSubscriptionEnvironment, Error, boolean> =
  (fiscalCode) =>
  ({
    userTrialSubscriptionRepository: { featureFlag, getUserSubscriptionDetail },
  }) =>
    featureFlag === "true"
      ? pipe(
          fiscalCode,
          getUserSubscriptionDetail,
          TE.map(({ state }) => state === "ACTIVE"),
        )
      : TE.right(true);

export const ensureUserInWhitelist: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<UserTrialSubscriptionEnvironment, Error, void> = flow(
  isUserSubscriptionActive,
  RTE.chain((isActive) =>
    isActive ? RTE.right(undefined) : RTE.left(new Error()),
  ),
  RTE.mapLeft(
    () => new EntityNotFoundError("The user does not belong to the trial"),
  ),
);

// Load testing users have a dummy fiscal code that starts with: LVTEST00A00
export const isLoadTestUser = (fiscalCode: FiscalCode) =>
  fiscalCode.startsWith("LVTEST00A00");
