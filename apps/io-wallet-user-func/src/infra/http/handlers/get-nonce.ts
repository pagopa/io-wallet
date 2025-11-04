import * as H from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { sendTelemetryException } from "@/infra/telemetry";
import { generateNonce, insertNonce } from "@/nonce";

export const GetNonceHandler = H.of(() =>
  pipe(
    generateNonce,
    RTE.fromIOEither,
    RTE.chainFirstW(insertNonce),
    RTE.map((nonce) => ({ nonce })),
    RTE.map(H.successJson),
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({ functionName: "getNonce" }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
