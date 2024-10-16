import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/Apply";
import * as RE from "fp-ts/ReaderEither";
import * as t from "io-ts";
import {
  AzureCosmosConfig,
  getAzureCosmosConfigFromEnvironment
} from "io-wallet-common/infra/azure/cosmos/config";

export const AzureConfig = t.type({
  cosmos: AzureCosmosConfig
});

export type AzureConfig = t.TypeOf<typeof AzureConfig>;

export const getAzureConfigFromEnvironment: RE.ReaderEither<NodeJS.ProcessEnv, Error, AzureConfig> = pipe(
  sequenceS(RE.Apply)({
    cosmos: getAzureCosmosConfigFromEnvironment,
  }),
  //@ts-ignore
  RE.map(({ cosmos }) => ({
    cosmos: {
      ...cosmos,
    },
  })),
);
