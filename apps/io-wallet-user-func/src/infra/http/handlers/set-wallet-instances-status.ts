import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { RevocationReason } from "io-wallet-common/wallet-instance";

import { sendTelemetryException } from "@/infra/telemetry";
import {
  getUserValidWalletInstancesId,
  revokeUserWalletInstances,
} from "@/wallet-instance";

const SetWalletInstancesStatusBody = t.type({
  fiscal_code: FiscalCode,
  reason: t.literal("USER_DECEASED"),
  status: t.literal("REVOKED"),
});

const requireSetWalletInstancesStatusBody: (
  req: H.HttpRequest,
) => E.Either<
  Error,
  { fiscalCode: FiscalCode; revocationReason: RevocationReason }
> = (req) =>
  pipe(
    req.body,
    H.parse(SetWalletInstancesStatusBody),
    E.map((body) => ({
      fiscalCode: body.fiscal_code,
      revocationReason: body.reason,
    })),
  );

export const SetWalletInstancesStatusHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireSetWalletInstancesStatusBody,
    RTE.fromEither,
    RTE.chainW(({ fiscalCode, revocationReason }) =>
      pipe(
        fiscalCode,
        getUserValidWalletInstancesId,
        RTE.chainW((walletInstancesId) =>
          revokeUserWalletInstances(
            fiscalCode,
            walletInstancesId,
            revocationReason,
          ),
        ),
        RTE.orElseFirstW(
          flow(
            sendTelemetryException({
              fiscalCode,
              functionName: "setWalletInstancesStatus",
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
