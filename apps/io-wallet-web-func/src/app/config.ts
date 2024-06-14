import * as t from "io-ts";
import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { readFromEnvironment } from "io-wallet-common";

const AzureConfiguration = t.type({
  cosmos: t.type({
    endpoint: t.string,
    dbName: t.string,
  }),
});

type AzureConfiguration = t.TypeOf<typeof AzureConfiguration>;

const Config = t.type({
  azure: AzureConfiguration,
});

type Config = t.TypeOf<typeof Config>;

const getAzureConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    cosmosDbEndpoint: readFromEnvironment("CosmosDbEndpoint"),
    cosmosDbDatabaseName: readFromEnvironment("CosmosDbDatabaseName"),
  }),
  RE.map(({ cosmosDbEndpoint, cosmosDbDatabaseName }) => ({
    cosmos: {
      endpoint: cosmosDbEndpoint,
      dbName: cosmosDbDatabaseName,
    },
  }))
);

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  RE.Do,
  RE.bind("azure", () => getAzureConfigFromEnvironment),
  RE.map(({ azure }) => ({
    azure,
  }))
);
