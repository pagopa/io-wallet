import { parse } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";
import {
  AzureCosmosConfig,
  getAzureCosmosConfigFromEnvironment,
} from "io-wallet-common/infra/azure/cosmos/config";
import {
  readFromEnvironment,
  stringToNumberDecoderRE,
} from "io-wallet-common/infra/env";

export const AzureStorageConfig = t.type({
  accountName: NonEmptyString,
  batchSize: t.number,
  bulkChunkSize: t.number,
  containerName: t.string,
  delayMs: t.number,
  queue: t.type({
    name: t.string,
  }),
});

export type AzureStorageConfig = t.TypeOf<typeof AzureStorageConfig>;

export const CosmosConfig = t.intersection([
  AzureCosmosConfig,
  t.type({
    containerName: t.string,
  }),
]);

export type CosmosConfig = t.TypeOf<typeof CosmosConfig>;

export const Configuration = t.type({
  azure: t.type({
    cosmos: CosmosConfig,
    storage: AzureStorageConfig,
  }),
});

export type Configuration = t.TypeOf<typeof Configuration>;

const getAzureStorageConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureStorageConfig
> = pipe(
  sequenceS(RE.Apply)({
    accountName: pipe(
      readFromEnvironment("StorageAccount__accountName"),
      RE.chainEitherKW(parse(NonEmptyString, "Invalid storage account name")),
    ),
    batchSize: pipe(
      readFromEnvironment("BatchSize"),
      RE.chainW(stringToNumberDecoderRE),
    ),
    bulkChunkSize: pipe(
      readFromEnvironment("BulkChunkSize"),
      RE.chainW(stringToNumberDecoderRE),
    ),
    containerName: readFromEnvironment("StorageAccountContainerName"),
    delayMs: pipe(
      readFromEnvironment("DelayMs"),
      RE.chainW(stringToNumberDecoderRE),
    ),
    queueName: readFromEnvironment("QueueName"),
  }),
  RE.map(
    ({
      accountName,
      batchSize,
      bulkChunkSize,
      containerName,
      delayMs,
      queueName,
    }) => ({
      accountName,
      batchSize,
      bulkChunkSize,
      containerName,
      delayMs,
      queue: {
        name: queueName,
      },
    }),
  ),
);

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Configuration
> = pipe(
  sequenceS(RE.Apply)({
    cosmos: pipe(
      sequenceS(RE.Apply)({
        config: getAzureCosmosConfigFromEnvironment,
        containerName: readFromEnvironment("CosmosContainerName"),
      }),
      RE.map(({ config, containerName }) => ({
        ...config,
        containerName,
      })),
    ),
    storage: getAzureStorageConfigFromEnvironment,
  }),
  RE.map((config) => ({
    azure: config,
  })),
);
