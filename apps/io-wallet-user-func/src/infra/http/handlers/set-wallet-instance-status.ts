import { revokeAllCredentials } from "@/credential";
import { revokeUserWalletInstances } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { requireWhitelistedFiscalCodeFromToken } from "../whitelisted-user";

const requireWalletInstanceId: (
  req: H.HttpRequest,
) => E.Either<Error, NonEmptyString> = (req) =>
  pipe(
    req.path,
    lookup("id"),
    E.fromOption(() => new H.HttpBadRequestError(`Missing "id" in path`)),
    E.chainW(H.parse(NonEmptyString, `Invalid "id" supplied`)),
  );

const SetWalletInstanceStatusBody = t.literal("REVOKED");

type SetWalletInstanceStatusBody = t.TypeOf<typeof SetWalletInstanceStatusBody>;

const requireSetWalletInstanceStatusBody: (
  req: H.HttpRequest,
) => E.Either<Error, SetWalletInstanceStatusBody> = (req) =>
  pipe(req.body, H.parse(SetWalletInstanceStatusBody, "Invalid body supplied"));

export const SetWalletInstanceStatusHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireWhitelistedFiscalCodeFromToken,
    RTE.chainW((fiscalCode) =>
      pipe(
        sequenceS(E.Apply)({
          body: pipe(req, requireSetWalletInstanceStatusBody),
          walletInstanceId: pipe(req, requireWalletInstanceId),
        }),
        RTE.fromEither,
        // invoke PID issuer services to revoke all credentials for that user
        RTE.chainFirstW(() => revokeAllCredentials(fiscalCode)),
        // access our database to revoke the wallet instance
        RTE.chainW(({ walletInstanceId }) =>
          revokeUserWalletInstances(fiscalCode, [walletInstanceId]),
        ),
        RTE.orElseFirstW((error) =>
          pipe(
            sendTelemetryException(error, {
              fiscalCode,
              functionName: "setWalletInstanceStatus",
              pathParameter: req.path,
              payload: req.body,
            }),
            RTE.fromReader,
          ),
        ),
      ),
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
