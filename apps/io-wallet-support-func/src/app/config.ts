import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";
import {
  AzureAppInsightsConfig,
  getAzureAppInsightsConfigFromEnvironment,
} from "io-wallet-common/infra/azure/appinsights/config";
import { readFromEnvironment, stringToNumberDecoderRE } from "io-wallet-common/infra/env";

const CosmosDbConfig = t.type({
  connectionString: t.string,
  endpoint: t.string,
  dbName: t.string,
  requestTimeout: NumberFromString,
});

type CosmosDbConfig = t.TypeOf<typeof CosmosDbConfig>;

const Config = t.type({
  azure: t.type({
    appInsights: AzureAppInsightsConfig,
    cosmos: CosmosDbConfig,
  }),
});

type Config = t.TypeOf<typeof Config>;

const getCosmosDbConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  CosmosDbConfig
> = pipe(
  sequenceS(RE.Apply)({
    connectionString: readFromEnvironment("CosmosDbConnectionString"),
    endpoint: readFromEnvironment("CosmosDbEndpoint"),
    dbName: readFromEnvironment("CosmosDbDatabaseName"),
    requestTimeout: pipe(
      readFromEnvironment("CosmosDbRequestTimeout"),
      RE.chainW(stringToNumberDecoderRE),
    ),
  }),
);

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  sequenceS(RE.Apply)({
    appInsights: getAzureAppInsightsConfigFromEnvironment,
    cosmos: getCosmosDbConfigFromEnvironment
  }),
  RE.map(({ appInsights, cosmos }) => ({
    azure: {
      appInsights,
      cosmos,
    },
  })),
);
