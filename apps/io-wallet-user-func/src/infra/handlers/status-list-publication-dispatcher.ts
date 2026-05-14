import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { enqueue } from "@/infra/azure/storage/queue";
import { sendTelemetryException } from "@/infra/telemetry";
import {
  listPublishableStatusListIds,
  StatusListPublication,
} from "@/status-list";

const enqueueStatusList = (
  statusListId: NonEmptyString,
): RTE.ReaderTaskEither<{ queueClient: QueueClient }, never, void> =>
  flow(
    enqueue({ statusListId }),
    TE.orElseW(
      flow(
        sendTelemetryException({
          functionName: "statusListPublicationDispatcher",
          statusListId,
        }),
        E.orElseW(() => E.right(undefined)),
        TE.fromEither,
      ),
    ),
  );

const dispatchStatusListPublications: RTE.ReaderTaskEither<
  {
    queueClient: QueueClient;
    statusListPublication: StatusListPublication;
  },
  Error,
  void
> = ({ queueClient, statusListPublication }) =>
  pipe(
    { statusListPublication },
    listPublishableStatusListIds,
    TE.chainW(
      TE.traverseSeqArray((statusListId) =>
        pipe({ queueClient }, enqueueStatusList(statusListId)),
      ),
    ),
    TE.map(() => undefined),
  );

export const StatusListPublicationDispatcherHandler = H.of(() =>
  pipe(
    dispatchStatusListPublications,
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "statusListPublicationDispatcher",
        }),
        RTE.fromEither,
      ),
    ),
  ),
);
