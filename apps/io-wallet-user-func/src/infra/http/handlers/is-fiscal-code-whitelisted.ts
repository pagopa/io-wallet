import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { checkIfFiscalCodeIsWhitelisted } from "@/whitelisted-fiscal-code";

import { requireFiscalCodeFromPath } from "../fiscal-code";

export const IsFiscalCodeWhitelistedHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireFiscalCodeFromPath,
    RTE.fromEither,
    RTE.chain((fiscalCode) =>
      pipe(
        checkIfFiscalCodeIsWhitelisted(fiscalCode),
        // RTE.map((x) => {
        //   console.log("res of checkIfFiscalCodeIsWhitelisted ", x);
        //   return x;
        // }),
        RTE.map(({ whitelisted, whitelistedAt }) => ({
          fiscalCode,
          whitelisted,
          ...(whitelisted ? { whitelistedAt } : {}),
        })),
      ),
    ),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "isFiscalCodeWhitelisted",
        }),
        RTE.fromReader,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
