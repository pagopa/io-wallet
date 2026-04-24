import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

import { sendTelemetryException } from "@/infra/telemetry";
import { manageStatusLists } from "@/use-cases/status-list-manager";

export const StatusListManagerHandler = H.of(() =>
  pipe(
    manageStatusLists,
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "StatusListManager",
        }),
        E.orElseW(() => E.right(undefined)),
        RTE.fromEither,
      ),
    ),
  ),
);
