import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { readFromEnvironment } from "../env";

export const PdvTokenizerApiClientConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  requestTimeout: NumberFromString,
  testUUID: t.string,
});

export type PdvTokenizerApiClientConfig = t.TypeOf<
  typeof PdvTokenizerApiClientConfig
>;

export const getPdvTokenizerConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Omit<PdvTokenizerApiClientConfig, "requestTimeout">
> = pipe(
  sequenceS(RE.Apply)({
    pdvTokenizerApiBaseURL: readFromEnvironment("PdvTokenizerApiBaseURL"),
    pdvTokenizerApiKey: readFromEnvironment("PdvTokenizerApiKey"),
    pdvTokenizerTestUUID: readFromEnvironment("PdvTokenizerTestUUID"),
  }),
  RE.map(
    ({ pdvTokenizerApiBaseURL, pdvTokenizerApiKey, pdvTokenizerTestUUID }) => ({
      apiKey: pdvTokenizerApiKey,
      baseURL: pdvTokenizerApiBaseURL,
      testUUID: pdvTokenizerTestUUID,
    }),
  ),
);
