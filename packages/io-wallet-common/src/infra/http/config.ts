import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";

import { readFromEnvironment, stringToNumberDecoderRE } from "../env";

const HttpRequestConfig = t.type({
  timeout: NumberFromString,
});

export type HttpRequestConfig = t.TypeOf<typeof HttpRequestConfig>;

export const getHttpRequestConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  HttpRequestConfig
> = pipe(
  sequenceS(RE.Apply)({
    timeout: pipe(
      readFromEnvironment("HttpRequestTimeout"),
      RE.chainW(stringToNumberDecoderRE),
    ),
  }),
);
