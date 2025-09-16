import { QueueClient } from "@azure/storage-queue";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import { stringify } from "fp-ts/lib/Json";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

class StorageQueueError extends Error {
  errorCode?: string;
  name = "StorageQueueError";
  constructor(errorCode?: string) {
    super("Unable to enqueue the message.");
    this.errorCode = errorCode;
  }
}

const toBase64 = flow(Buffer.from, (b) => b.toString("base64"));

const sendMessage =
  (
    message: string,
  ): RTE.ReaderTaskEither<
    { queueClient: QueueClient },
    StorageQueueError,
    void
  > =>
  ({ queueClient }) =>
    pipe(
      TE.tryCatch(() => queueClient.sendMessage(message), E.toError),
      TE.filterOrElse(
        (response) => response.errorCode === undefined,
        (response) => new StorageQueueError(response.errorCode),
      ),
      TE.map(() => undefined),
    );

export const enqueue = flow(
  stringify,
  E.mapLeft(() => new Error("Unable to serialize the message.")),
  E.map(toBase64),
  RTE.fromEither,
  RTE.chainW(sendMessage),
);
