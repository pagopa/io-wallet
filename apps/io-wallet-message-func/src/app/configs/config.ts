import { AzureConfig, getAzureConfigFromEnvironment } from "./azureConfig";
import * as RE from "fp-ts/ReaderEither";
import * as t from "io-ts";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/Apply";
import { IoServiceConfig, getIoServiceConfigFromEnvironment } from "./ioServiceConfig";

export const CosmosDbConfig = t.type({
    ioService: IoServiceConfig,
    azure: AzureConfig,
});

export type AppConfig = t.TypeOf<typeof CosmosDbConfig>;

export const getAppConfigFromEnvironment: RE.ReaderEither<NodeJS.ProcessEnv, Error, AppConfig> =
    pipe(
        sequenceS(RE.Apply)({
            azure: pipe(
                getAzureConfigFromEnvironment
            ),
            ioService: pipe(
                getIoServiceConfigFromEnvironment
            )
        })
    );
