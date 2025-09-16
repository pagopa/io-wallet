import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { generateNonce, insertNonce } from "@/nonce";

export const GetNonceHandler = H.of(() =>
  pipe(
    generateNonce,
    RTE.fromIOEither,
    RTE.chainFirstW(insertNonce),
    RTE.map((nonce) => ({ nonce })),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "getNonce",
        }),
        RTE.fromReader,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
