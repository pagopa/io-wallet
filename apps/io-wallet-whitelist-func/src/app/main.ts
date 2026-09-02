import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { QueueServiceClient } from "@azure/storage-queue";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";

import { getConfigFromEnvironment } from "@/app/config";
import { CosmosDbWhitelistedFiscalCodeRepository } from "@/infra/azure/cosmos/whitelisted-fiscal-code";
import { EnqueueWhitelistedFiscalCodesFunction } from "@/infra/azure/functions/enqueue-whitelisted-fiscal-codes";
import { HealthFunction } from "@/infra/azure/functions/health";
import { InsertWhitelistedFiscalCodesFunction } from "@/infra/azure/functions/insert-whitelisted-fiscal-codes";
import { BufferDecoder } from "@/infra/decoders/buffer";

const config = pipe(
  process.env,
  getConfigFromEnvironment,
  E.getOrElseW((error) => {
    throw error;
  }),
);

const credential = new DefaultAzureCredential();

const cosmosClient = new CosmosClient({
  aadCredentials: credential,
  connectionPolicy: {
    requestTimeout: config.azure.cosmos.requestTimeout,
  },
  endpoint: config.azure.cosmos.endpoint,
});

const database = cosmosClient.database(config.azure.cosmos.dbName);

const whitelistedFiscalCodeRepository =
  new CosmosDbWhitelistedFiscalCodeRepository(
    database,
    config.azure.cosmos.containerName,
    {
      bulkChunkSize: config.azure.storage.bulkChunkSize,
      delayMs: config.azure.storage.delayMs,
    },
  );

const queueServiceClient = new QueueServiceClient(
  `https://${config.azure.storage.accountName}.queue.core.windows.net`,
  credential,
);

const whitelistedFiscalCodesQueueClient = queueServiceClient.getQueueClient(
  config.azure.storage.queue.name,
);

app.http("health", {
  authLevel: "anonymous",
  handler: HealthFunction({
    cosmosClient,
  }),
  methods: ["GET"],
  route: "health",
});

app.storageBlob("enqueueWhitelistedFiscalCodes", {
  connection: "StorageAccount",
  handler: EnqueueWhitelistedFiscalCodesFunction({
    batchSize: config.azure.storage.batchSize,
    inputDecoder: BufferDecoder,
    queueClient: whitelistedFiscalCodesQueueClient,
  }),
  path: `${config.azure.storage.containerName}/{name}.csv`,
});

app.storageQueue("insertWhitelistedFiscalCodes", {
  connection: "StorageAccount",
  handler: InsertWhitelistedFiscalCodesFunction({
    inputDecoder: t.array(FiscalCode),
    whitelistedFiscalCodeRepository,
  }),
  queueName: config.azure.storage.queue.name,
});
