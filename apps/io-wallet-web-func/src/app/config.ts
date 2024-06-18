import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { readFromEnvironment } from "io-wallet-common";

const AzureConfiguration = t.type({
  cosmos: t.type({
    dbName: t.string,
    endpoint: t.string,
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

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  RE.Do,
  RE.bind("azure", () => getAzureConfigFromEnvironment),
  RE.map(({ azure }) => ({
    azure,
  })),
);
