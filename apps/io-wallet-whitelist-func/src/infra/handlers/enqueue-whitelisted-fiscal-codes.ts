import { StorageBlobClient } from "@azure/functions-extensions-blob";
import { QueueClient } from "@azure/storage-queue";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { createInterface } from "node:readline";

import { enqueue } from "@/infra/azure/storage/queue";
import { sendTelemetryException } from "@/infra/telemetry";

const enqueueBatch = async (
  fiscalCodes: FiscalCode[],
  queueClient: QueueClient,
): Promise<void> => {
  const result = await enqueue(fiscalCodes)({ queueClient })();

  if (E.isLeft(result)) {
    throw result.left;
  }
};

const enqueueWhitelistedFiscalCodes = async (
  stream: NodeJS.ReadableStream,
  { batchSize, queueClient }: { batchSize: number; queueClient: QueueClient },
): Promise<void> => {
  const lines = createInterface({ crlfDelay: Infinity, input: stream });
  let fiscalCodes: FiscalCode[] = [];

  for await (const line of lines) {
    const fiscalCode = pipe(
      line,
      FiscalCode.decode,
      E.mapLeft(() => new Error(`Invalid fiscal code: "${line}"`)),
    );

    if (E.isLeft(fiscalCode)) {
      throw fiscalCode.left;
    }

    fiscalCodes.push(fiscalCode.right);

    if (fiscalCodes.length === batchSize) {
      await enqueueBatch(fiscalCodes, queueClient);
      fiscalCodes = [];
    }
  }

  if (fiscalCodes.length > 0) {
    await enqueueBatch(fiscalCodes, queueClient);
  }
};

export const EnqueueWhitelistedFiscalCodesFunction =
  ({
    batchSize,
    queueClient,
  }: {
    batchSize: number;
    queueClient: QueueClient;
  }) =>
  async (blobStorageClient: StorageBlobClient): Promise<void> => {
    try {
      const { readableStreamBody } =
        await blobStorageClient.blobClient.download();

      if (readableStreamBody === undefined) {
        throw new Error("The triggered blob has no readable stream.");
      }

      await enqueueWhitelistedFiscalCodes(readableStreamBody, {
        batchSize,
        queueClient,
      });
    } catch (error) {
      const exception =
        error instanceof Error ? error : new Error(String(error));
      sendTelemetryException({
        functionName: "enqueueWhitelistedFiscalCodes",
      })(exception);
      throw exception;
    }
  };
