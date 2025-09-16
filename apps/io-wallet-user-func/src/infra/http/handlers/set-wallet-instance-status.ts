import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { revokeAllCredentials } from "@/credential";
import { enqueue } from "@/infra/azure/storage/queue";
import { revokeUserWalletInstances } from "@/wallet-instance";

import { requireWalletInstanceId } from "../wallet-instance";

const SetWalletInstanceStatusBody = t.type({
  fiscal_code: FiscalCode,
  status: t.literal("REVOKED"),
});

type SetWalletInstanceStatusBody = t.TypeOf<typeof SetWalletInstanceStatusBody>;

const requireSetWalletInstanceStatusBody: (
  req: H.HttpRequest,
) => E.Either<Error, SetWalletInstanceStatusBody> = (req) =>
  pipe(req.body, H.parse(SetWalletInstanceStatusBody, "Invalid body supplied"));

export const SetWalletInstanceStatusHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(E.Apply)({
      fiscalCode: pipe(
        req,
        requireSetWalletInstanceStatusBody,
        E.map(({ fiscal_code }) => fiscal_code),
      ),
      walletInstanceId: pipe(req, requireWalletInstanceId),
    }),
    RTE.fromEither,
    RTE.chain(({ fiscalCode, walletInstanceId }) =>
      pipe(
        // invoke PID issuer services to revoke all credentials for that user
        revokeAllCredentials(fiscalCode),
        RTE.chainW(() =>
          pipe(
            // access our database to revoke the wallet instance
            revokeUserWalletInstances(
              fiscalCode,
              [walletInstanceId],
              "REVOKED_BY_USER",
            ),
            RTE.chainW(() =>
              enqueue({
                fiscalCode,
                revokedAt: new Date(),
              }),
            ),
          ),
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
