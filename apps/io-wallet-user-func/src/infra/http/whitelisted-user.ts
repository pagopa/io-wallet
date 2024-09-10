import { JwtEnvironment } from "@/jwt-validator";
import {
  UserTrialSubscriptionEnvironment,
  ensureUserInWhitelist,
} from "@/user";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import { flow } from "fp-ts/function";
import {
  User,
  UserEnvironment,
  getUserByFiscalCode,
} from "io-wallet-common/user";

import { requireFiscalCodeFromToken } from "./jwt-validator";

export const requireWhitelistedFiscalCodeFromToken: (
  req: H.HttpRequest,
) => RTE.ReaderTaskEither<
  JwtEnvironment & UserTrialSubscriptionEnvironment,
  Error,
  FiscalCode
> = flow(requireFiscalCodeFromToken, RTE.chainFirstW(ensureUserInWhitelist));

export const requireWhitelistedUserFromToken: (
  req: H.HttpRequest,
) => RTE.ReaderTaskEither<
  JwtEnvironment & UserEnvironment & UserTrialSubscriptionEnvironment,
  Error,
  User
> = flow(
  requireWhitelistedFiscalCodeFromToken,
  RTE.chainW(getUserByFiscalCode),
);
