import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

import { enqueue } from "../azure/storage/queue";

interface Queue {
  batchSize: number;
  queueClient: QueueClient;
}

// TODO [SIW-1995]: fp-ts
const split: (input: string) => R.Reader<Queue, string[]> =
  (input) =>
  ({ batchSize }) => {
    const charsPerGroup = batchSize * 17;
    const groups: string[] = [];

    for (let i = 0; i < input.length; i += charsPerGroup) {
      groups.push(input.substring(i, i + charsPerGroup));
    }

    return groups;
  };

const dispatchToQueue: (
  values: string[],
) => RTE.ReaderTaskEither<Queue, Error, void> =
  (values) =>
  ({ queueClient }) =>
    pipe(
      values,
      RA.map((value) => pipe({ queueClient }, enqueue(value))),
      RA.sequence(TE.ApplicativePar),
      TE.map(() => undefined),
    );

const insertFiscalCodesInQueue: (
  buffer: Buffer<ArrayBuffer>,
) => RTE.ReaderTaskEither<Queue, Error, void> = (buffer) =>
  pipe(
    buffer.toString(),
    // splits a string of fiscal codes (separated by \n) into batches of the specified size
    split,
    RTE.fromReader,
    RTE.chain(dispatchToQueue),
  );

export const InsertFiscalCodesInQueueHandler = H.of(insertFiscalCodesInQueue);
