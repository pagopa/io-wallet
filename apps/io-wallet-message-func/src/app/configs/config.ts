import { sequenceS } from "fp-ts/Apply";
import * as RE from "fp-ts/ReaderEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";

import { AzureConfig, getAzureConfigFromEnvironment } from "./azureConfig";
import {
  IoServiceConfig,
  getIoServiceConfigFromEnvironment,
} from "./ioServiceConfig";

export const CosmosDbConfig = t.type({
  azure: AzureConfig,
  ioService: IoServiceConfig,
});

export type AppConfig = t.TypeOf<typeof CosmosDbConfig>;

export const getAppConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AppConfig
> = pipe(
  sequenceS(RE.Apply)({
    azure: pipe(getAzureConfigFromEnvironment),
    ioService: pipe(getIoServiceConfigFromEnvironment),
  }),
);
