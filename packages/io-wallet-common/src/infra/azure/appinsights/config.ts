import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";

import { readFromEnvironment } from "../../env";

export const AzureAppInsightsConfig = t.type({
  connectionString: t.string,
});

type AzureAppInsightsConfig = t.TypeOf<typeof AzureAppInsightsConfig>;

export const getAzureAppInsightsConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureAppInsightsConfig
> = pipe(
  sequenceS(RE.Apply)({
    connectionString: readFromEnvironment("AppInsightsConnectionString"),
  }),
);
