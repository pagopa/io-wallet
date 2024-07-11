import { HslJwtEnvironment } from "@/jwt-validator";
import {
  User,
  UserEnvironment,
  UserTrialSubscriptionEnvironment,
  ensureUserInWhitelist,
  getUserByFiscalCode,
} from "@/user";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/ReaderTaskEither";
import { flow } from "fp-ts/function";

import { requireFiscalCodeFromToken } from "./jwt-validator";

export const requireWhitelistedUserFromToken: (
  req: H.HttpRequest,
) => RTE.ReaderTaskEither<
  HslJwtEnvironment & UserEnvironment & UserTrialSubscriptionEnvironment,
  Error,
  User
> = flow(
  requireFiscalCodeFromToken,
  RTE.chainFirstW(ensureUserInWhitelist),
  RTE.chainW(getUserByFiscalCode),
);
