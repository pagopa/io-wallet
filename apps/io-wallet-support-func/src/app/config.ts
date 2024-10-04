import { pipe } from "fp-ts/function";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";
import {
  AzureCosmosConfig,
  getAzureCosmosConfigFromEnvironment,
} from "io-wallet-common/infra/azure/cosmos/config";

const Config = t.type({
  azure: t.type({ cosmos: AzureCosmosConfig }),
});

type Config = t.TypeOf<typeof Config>;

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  getAzureCosmosConfigFromEnvironment,
  RE.map((cosmos) => ({
    azure: {
      cosmos,
    },
  })),
);
