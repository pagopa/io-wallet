import * as H from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { sendTelemetryException } from "@/infra/telemetry";
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
        RTE.map(({ whitelisted, whitelistedAt }) => ({
          fiscalCode,
          whitelisted,
          ...(whitelisted ? { whitelistedAt } : {}),
        })),
        RTE.map(H.successJson),
        RTE.orElseFirstW(
          flow(
            sendTelemetryException({
              fiscalCode,
              functionName: "isFiscalCodeWhitelisted",
            }),
            RTE.fromEither,
          ),
        ),
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
