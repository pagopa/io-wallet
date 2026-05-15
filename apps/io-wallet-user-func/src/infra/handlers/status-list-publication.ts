import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";

import { sendTelemetryException } from "@/infra/telemetry";
import { publishStatusList } from "@/status-list";

export const StatusListPublicationHandler = H.of(
  ({ statusListId }: { statusListId: NonEmptyString }) =>
    pipe(
      statusListId,
      publishStatusList,
      RTE.orElseFirstW(
        flow(
          sendTelemetryException({
            functionName: "statusListPublication",
            statusListId,
          }),
          E.orElseW(() => E.right(undefined)),
          RTE.fromEither,
        ),
      ),
    ),
);
