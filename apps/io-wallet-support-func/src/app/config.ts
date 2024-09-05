import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";
import { readFromEnvironment } from "io-wallet-common/infra/env";

const AzureConfiguration = t.type({
  cosmos: t.type({
    dbName: t.string,
    endpoint: t.string,
  }),
});

type AzureConfiguration = t.TypeOf<typeof AzureConfiguration>;

export const getAzureConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    cosmosDbDatabaseName: readFromEnvironment("CosmosDbDatabaseName"),
    cosmosDbEndpoint: readFromEnvironment("CosmosDbEndpoint"),
  }),
  RE.map(({ cosmosDbDatabaseName, cosmosDbEndpoint }) => ({
    cosmos: {
      dbName: cosmosDbDatabaseName,
      endpoint: cosmosDbEndpoint,
    },
  })),
);

// PDV has to be added
export const Config = t.type({
  azure: AzureConfiguration,
});

export type Config = t.TypeOf<typeof Config>;

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  sequenceS(RE.Apply)({
    azure: getAzureConfigFromEnvironment,
  }),
);
