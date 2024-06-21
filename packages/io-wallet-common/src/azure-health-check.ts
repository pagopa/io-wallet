import { CosmosClient } from "@azure/cosmos";
import { QueueClient } from "@azure/storage-queue";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export class HealthCheckError extends Error {
  name = "HealthCheckError";
  constructor(cause?: string) {
    super(`The function is not healthy. ${cause}`);
  }
}

export const getCosmosHealth: RTE.ReaderTaskEither<
  { cosmosClient: CosmosClient },
  Error,
  true
> = ({ cosmosClient }) =>
  pipe(
    TE.tryCatch(
      () => cosmosClient.getDatabaseAccount(),
      () => new Error("cosmos-db-error"),
    ),
    TE.map(() => true),
  );

export const getStorageQueueHealth: RTE.ReaderTaskEither<
  {
    queueClient: QueueClient;
  },
  Error,
  true
> = ({ queueClient }) =>
  pipe(
    TE.tryCatch(
      () => queueClient.exists(),
      () => new Error("storage-queue-error"),
    ),
    TE.chain((exists) =>
      exists ? TE.right(true) : TE.left(new Error("storage-queue-error")),
    ),
  );
