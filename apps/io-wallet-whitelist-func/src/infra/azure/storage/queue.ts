import { QueueClient } from "@azure/storage-queue";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import { stringify } from "fp-ts/lib/Json";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

const maxEnqueueAttempts = 3;

class StorageQueueError extends Error {
  errorCode?: string;
  name = "StorageQueueError";

  constructor(errorCode?: string, message = "Unable to enqueue the message.") {
    super(message);
    this.errorCode = errorCode;
  }
}

const toBase64 = flow(Buffer.from, (b) => b.toString("base64"));

const toStorageQueueError = (error: unknown) =>
  error instanceof StorageQueueError
    ? error
    : new StorageQueueError(
        undefined,
        error instanceof Error
          ? error.message
          : "Unable to enqueue the message.",
      );

const sendMessageOnce =
  (
    message: string,
  ): RTE.ReaderTaskEither<
    { queueClient: QueueClient },
    StorageQueueError,
    void
  > =>
  ({ queueClient }) =>
    pipe(
      TE.tryCatch(() => queueClient.sendMessage(message), toStorageQueueError),
      TE.filterOrElse(
        (response) => response.errorCode === undefined,
        (response) => new StorageQueueError(response.errorCode),
      ),
      TE.map(() => undefined),
    );

const sendMessageWithRetry = (
  message: string,
  remainingAttempts: number = maxEnqueueAttempts,
): RTE.ReaderTaskEither<
  { queueClient: QueueClient },
  StorageQueueError,
  void
> =>
  pipe(
    message,
    sendMessageOnce,
    RTE.orElseW((error) =>
      remainingAttempts > 1
        ? sendMessageWithRetry(message, remainingAttempts - 1)
        : RTE.left(error),
    ),
  );

export const enqueue = flow(
  stringify,
  E.mapLeft(() => new Error("Unable to serialize the message.")),
  E.map(toBase64),
  RTE.fromEither,
  RTE.chainW(sendMessageWithRetry),
);
