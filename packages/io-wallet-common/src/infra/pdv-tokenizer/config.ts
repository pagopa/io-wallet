import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { readFromEnvironment, stringToNumberDecoderRE } from "../env";

export const PdvTokenizerApiClientConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  circuitBreakerErrorThreshold: NumberFromString,
  circuitBreakerResetTimeout: NumberFromString,
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
    apiKey: readFromEnvironment("PdvTokenizerApiKey"),
    baseURL: readFromEnvironment("PdvTokenizerApiBaseURL"),
    circuitBreakerErrorThreshold: pipe(
      readFromEnvironment("PdvTokenizerCircuitBreakerErrorThreshold"),
      RE.chainW(stringToNumberDecoderRE),
      RE.orElse(() => RE.right(50)),
    ),
    circuitBreakerResetTimeout: pipe(
      readFromEnvironment("PdvTokenizerCircuitBreakerResetTimeout"),
      RE.chainW(stringToNumberDecoderRE),
      RE.orElse(() => RE.right(5000)),
    ),
    testUUID: readFromEnvironment("PdvTokenizerTestUUID"),
  }),
);
