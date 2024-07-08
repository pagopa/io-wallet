import { HslJwtEnvironment } from "@/jwt-validator";
import {
  User,
  UserEnvironment,
  UserTrialSubscriptionEnvironment,
  ensureUserInWhitelist,
} from "@/user";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/ReaderTaskEither";
import { flow } from "fp-ts/function";

import { UnauthorizedError } from "./error";
import { requireUserFromToken } from "./token-auth";
import { requireUserFromHeader } from "./user-header";

export const requireWhitelistedUserFromHeader: (
  req: H.HttpRequest,
) => RTE.ReaderTaskEither<UserTrialSubscriptionEnvironment, Error, User> = flow(
  requireUserFromHeader,
  RTE.fromEither,
  RTE.chainFirstW(
    flow(
      ensureUserInWhitelist,
      RTE.mapLeft(() => new UnauthorizedError()),
    ),
  ),
);

export const requireWhitelistedUserFromToken: (
  req: H.HttpRequest,
) => RTE.ReaderTaskEither<
  HslJwtEnvironment & UserEnvironment & UserTrialSubscriptionEnvironment,
  Error,
  User
> = flow(
  requireUserFromToken,
  RTE.chainFirstW(
    flow(
      ensureUserInWhitelist,
      RTE.mapLeft(() => new UnauthorizedError()),
    ),
  ),
);
