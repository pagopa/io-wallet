import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { enqueue } from "@/infra/azure/storage/queue";
import { sendTelemetryException } from "@/infra/telemetry";

const parseWhitelistedFiscalCodes = (
  buffer: Buffer<ArrayBufferLike>,
): E.Either<Error, FiscalCode[]> =>
  pipe(
    buffer.toString().split(/\n/),
    A.traverse(E.Applicative)((item) =>
      pipe(
        item,
        FiscalCode.decode,
        E.mapLeft(() => new Error(`Invalid fiscal code: "${item}"`)),
      ),
    ),
  );

const enqueueWhitelistedFiscalCodes =
  (
    buffer: Buffer<ArrayBufferLike>,
  ): RTE.ReaderTaskEither<
    {
      batchSize: number;
      queueClient: QueueClient;
    },
    Error,
    void
  > =>
  ({ batchSize, queueClient }) =>
    pipe(
      buffer,
      parseWhitelistedFiscalCodes,
      TE.fromEither,
      TE.map(A.chunksOf(batchSize)),
      TE.chainW((fiscalCodes) =>
        pipe({ queueClient }, RTE.traverseSeqArray(enqueue)(fiscalCodes)),
      ),
      TE.map(() => undefined),
    );

export const EnqueueWhitelistedFiscalCodesHandler = H.of(
  (fiscalCodes: Buffer<ArrayBufferLike>) =>
    pipe(
      fiscalCodes,
      enqueueWhitelistedFiscalCodes,
      RTE.orElseFirstW(
        flow(
          sendTelemetryException({
            functionName: "enqueueWhitelistedFiscalCodes",
          }),
          E.orElseW(() => E.right(undefined)),
          RTE.fromEither,
        ),
      ),
    ),
);
