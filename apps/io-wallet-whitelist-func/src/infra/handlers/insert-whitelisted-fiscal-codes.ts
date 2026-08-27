import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import { flow } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";

import { sendTelemetryException } from "@/infra/telemetry";
import { insertWhitelistedFiscalCodes } from "@/whitelisted-fiscal-code";

export const InsertWhitelistedFiscalCodesHandler = H.of(
  flow(
    insertWhitelistedFiscalCodes,
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "insertWhitelistedFiscalCodes",
        }),
        E.orElseW(() => E.right(undefined)),
        RTE.fromEither,
      ),
    ),
  ),
);
