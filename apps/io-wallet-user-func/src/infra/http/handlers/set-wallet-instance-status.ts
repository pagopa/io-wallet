import { revokeUserWalletInstances } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { requireWalletInstanceId } from "../wallet-instance";
import { QueueClient } from "@azure/storage-queue";

const SetWalletInstanceStatusBody = t.type({
  fiscal_code: FiscalCode,
  status: t.literal("REVOKED"),
});

type SetWalletInstanceStatusBody = t.TypeOf<typeof SetWalletInstanceStatusBody>;

const requireSetWalletInstanceStatusBody: (
  req: H.HttpRequest,
) => E.Either<Error, SetWalletInstanceStatusBody> = (req) =>
  pipe(req.body, H.parse(SetWalletInstanceStatusBody, "Invalid body supplied"));

declare const enqueueFiscalCode: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<{ queueClient: QueueClient }, Error, void>;

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
        // TODO: comment
        fiscalCode,
        enqueueFiscalCode,
        RTE.chainW(() =>
          // access our database to revoke the wallet instance
          revokeUserWalletInstances(
            fiscalCode,
            [walletInstanceId],
            "REVOKED_BY_USER",
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
