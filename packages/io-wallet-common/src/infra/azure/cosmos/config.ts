import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { readableReportSimplified } from "@pagopa/ts-commons/lib/reporters";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { readFromEnvironment } from "../../env";

export const AzureCosmosConfig = t.type({
  dbName: t.string,
  endpoint: t.string,
  requestTimeout: NumberFromString,
});

type AzureCosmosConfig = t.TypeOf<typeof AzureCosmosConfig>;

export const getAzureCosmosConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureCosmosConfig
> = pipe(
  sequenceS(RE.Apply)({
    dbName: readFromEnvironment("CosmosDbDatabaseName"),
    endpoint: readFromEnvironment("CosmosDbEndpoint"),
    requestTimeout: pipe(
      readFromEnvironment("CosmosDbRequestTimeout"),
      RE.chainW(
        flow(
          NumberFromString.decode,
          RE.fromEither,
          RE.mapLeft((errs) => Error(readableReportSimplified(errs))),
        ),
      ),
    ),
  }),
);
