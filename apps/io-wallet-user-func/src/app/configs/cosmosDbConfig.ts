import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import {
  readFromEnvironment,
  stringToNumberDecoderRE,
} from "io-wallet-common/infra/env";

export const CosmosDbConfig = t.type({
    connectionString: t.string,
    endpoint: t.string,
    dbName: t.string,
    requestTimeout: NumberFromString,
});
  
export type CosmosDbConfig = t.TypeOf<typeof CosmosDbConfig>;

export const getCosmosDbConfigFromEnvironment: RE.ReaderEither<
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
