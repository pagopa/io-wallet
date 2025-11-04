import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { revokeAllCredentials } from "@/credential";
import { enqueue } from "@/infra/azure/storage/queue";
import { requireWalletInstanceId } from "@/infra/http/wallet-instance";
import { sendTelemetryException } from "@/infra/telemetry";
import { revokeUserWalletInstances } from "@/wallet-instance";
import {
  checkIfFiscalCodeIsWhitelisted,
  WhitelistedFiscalCodeEnvironment,
} from "@/whitelisted-fiscal-code";

const SetWalletInstanceStatusBody = t.type({
  fiscal_code: FiscalCode,
  status: t.literal("REVOKED"),
});

type SetWalletInstanceStatusBody = t.TypeOf<typeof SetWalletInstanceStatusBody>;

const requireSetWalletInstanceStatusBody: (
  req: H.HttpRequest,
) => E.Either<Error, SetWalletInstanceStatusBody> = (req) =>
  pipe(req.body, H.parse(SetWalletInstanceStatusBody, "Invalid body supplied"));

// this function sends the email only if the user is NOT whitelisted
const sendEmail: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<
  WhitelistedFiscalCodeEnvironment & { queueClient: QueueClient },
  Error,
  void
> = (fiscalCode) =>
  pipe(
    fiscalCode,
    checkIfFiscalCodeIsWhitelisted,
    RTE.chain(({ whitelisted }) =>
      whitelisted
        ? RTE.of(undefined)
        : enqueue({
            fiscalCode,
            revokedAt: new Date(),
          }),
    ),
  );

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
            RTE.chainW(() => sendEmail(fiscalCode)),
          ),
        ),
        RTE.orElseFirstW(
          flow(
            sendTelemetryException({
              fiscalCode,
              functionName: "setWalletInstanceStatus",
              pathParameter: req.path,
              payload: req.body,
            }),
            RTE.fromEither,
          ),
        ),
      ),
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
