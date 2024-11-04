import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { getCurrentWalletInstance } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { WalletInstanceToStatusApiModel } from "../encoders/wallet-instance";
import { requireWhitelistedFiscalCode } from "../whitelisted-user";

const GetCurrentWalletInstanceStatusBody = t.type({
  fiscal_code: FiscalCode,
});

type GetCurrentWalletInstanceStatusBody = t.TypeOf<
  typeof GetCurrentWalletInstanceStatusBody
>;

const requireFiscalCode = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(GetCurrentWalletInstanceStatusBody),
    E.map(({ fiscal_code }) => fiscal_code),
  );

export const GetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireFiscalCode,
      RTE.fromEither,
      RTE.chainFirst(requireWhitelistedFiscalCode),
      RTE.chainW((fiscalCode) =>
        pipe(
          getCurrentWalletInstance(fiscalCode),
          RTE.map(WalletInstanceToStatusApiModel.encode),
          RTE.map(H.successJson),
          RTE.orElseFirstW((error) =>
            sendExceptionWithBodyToAppInsights(
              error,
              req.body,
              "getCurrentWalletInstanceStatus",
            ),
          ),
        ),
      ),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
