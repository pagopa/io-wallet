import { revokeAllCredentials } from "@/credential";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { getCurrentWalletInstance } from "@/wallet-instance";
import {
  WalletInstanceEnvironment,
  revokeUserWalletInstances,
} from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const SetCurrentWalletInstanceStatusBody = t.type({
  fiscal_code: FiscalCode,
  status: t.literal("REVOKED"),
});

type SetCurrentWalletInstanceStatusBody = t.TypeOf<
  typeof SetCurrentWalletInstanceStatusBody
>;

const requireSetCurrentWalletInstanceStatusBody: (
  req: H.HttpRequest,
) => E.Either<Error, SetCurrentWalletInstanceStatusBody> = (req) =>
  pipe(
    req.body,
    H.parse(SetCurrentWalletInstanceStatusBody, "Invalid body supplied"),
  );

const revokeCurrentUserWalletInstance: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> = (
  fiscalCode,
) =>
  pipe(
    fiscalCode,
    getCurrentWalletInstance,
    RTE.chainW(({ id, userId }) =>
      revokeUserWalletInstances(userId, [id], "REVOKED_BY_USER"),
    ),
  );

export const SetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireSetCurrentWalletInstanceStatusBody,
      E.map(({ fiscal_code }) => fiscal_code),
      RTE.fromEither,
      // invoke PID issuer services to revoke all credentials for that user
      RTE.chainFirst(revokeAllCredentials), // TODO: SIW-1708 analysis on asynchronous call
      // revoke the wallet instance in the database
      RTE.chainW(revokeCurrentUserWalletInstance),
      RTE.map(() => H.empty),
      RTE.orElseFirstW((error) =>
        sendExceptionWithBodyToAppInsights(
          error,
          req.body,
          "setCurrentWalletInstanceStatus",
        ),
      ),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
