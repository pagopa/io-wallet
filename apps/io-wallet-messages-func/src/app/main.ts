import { BufferDecoder } from "@/decoders/buffer";
import { InsertFiscalCodesInQueueFunction } from "@/infra/azure/functions/insert-fiscal-codes-in-queue";
import { SendMessagesFunction } from "@/infra/azure/functions/send-messages";
import { sendMessageApi } from "@/infra/io-messages-api";
import { app } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import Bottleneck from "bottleneck";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";

import { getConfigFromEnvironment } from "./config";

const configOrError = pipe(
  process.env,
  getConfigFromEnvironment,
  E.getOrElseW(identity),
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const {
  azure: { storage },
  fiscalCodesBatchSize,
  messagesService,
} = configOrError;

const queueServiceClient = QueueServiceClient.fromConnectionString(
  storage.connectionString,
);

const inputQueueClient = queueServiceClient.getQueueClient(storage.queue.name);

const blobServiceClient = BlobServiceClient.fromConnectionString(
  storage.connectionString,
);

const outputContainerClient = blobServiceClient.getContainerClient(
  storage.containers.output.name,
);

const limiter = new Bottleneck({
  maxConcurrent: messagesService.maxConcurrentRequests,
  minTime: messagesService.minTimeConsecutiveRequests,
});

app.storageBlob("insertFiscalCodesInQueue", {
  connection: "StorageConnectionString",
  handler: InsertFiscalCodesInQueueFunction({
    batchSize: fiscalCodesBatchSize,
    inputDecoder: BufferDecoder,
    queueClient: inputQueueClient,
  }),
  path: `${storage.containers.input.name}/fiscal-codes.csv`,
});

app.storageQueue("sendMessages", {
  connection: "StorageConnectionString",
  handler: SendMessagesFunction({
    containerClient: outputContainerClient,
    inputDecoder: t.string,
    sendMessage: sendMessageApi({
      config: {
        apiKey: messagesService.apiKey,
        baseURL: messagesService.baseURL,
      },
      limiter,
    }),
  }),
  queueName: storage.queue.name,
});
