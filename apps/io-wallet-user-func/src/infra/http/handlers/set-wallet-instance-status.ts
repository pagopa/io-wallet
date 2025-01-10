import { revokeAllCredentials } from "@/credential";
import { enqueue } from "@/infra/azure/storage/queue";
import {
  WalletInstanceEnvironment,
  revokeUserWalletInstances,
} from "@/wallet-instance";
import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { WalletInstance } from "io-wallet-common/wallet-instance";

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

const revokeWalletInstances = (
  fiscalCode: WalletInstance["userId"],
  walletInstanceId: WalletInstance["id"],
): RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =>
  revokeUserWalletInstances(fiscalCode, [walletInstanceId], "REVOKED_BY_USER");

const sendRevocationEmail =
  (
    fiscalCode: string,
    revokedAt: string,
  ): RTE.ReaderTaskEither<
    {
      emailRevocationQueuingEnabled: boolean;
      queueRevocationClient: QueueClient;
    },
    Error,
    void
  > =>
  ({ emailRevocationQueuingEnabled, queueRevocationClient }) =>
    emailRevocationQueuingEnabled
      ? pipe(
          { queueClient: queueRevocationClient },
          enqueue({
            fiscalCode,
            revokedAt,
          }),
        )
      : TE.right(void 0);

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
            revokeWalletInstances(fiscalCode, walletInstanceId),
            RTE.chainW(() =>
              sendRevocationEmail(fiscalCode, new Date().toISOString()),
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
