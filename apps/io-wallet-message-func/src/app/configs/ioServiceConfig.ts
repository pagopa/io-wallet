import { sequenceS } from "fp-ts/Apply";
import * as RE from "fp-ts/ReaderEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import { readFromEnvironment } from "io-wallet-common/infra/env";

export const IoServiceConfig = t.type({
  ioServiceApiKey: t.string,
  ioServiceBaseUrl: t.string,
  ioServiceRequestTimeout: t.number,
});

export type IoServiceConfig = t.TypeOf<typeof IoServiceConfig>;

export const getIoServiceConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  IoServiceConfig
> = pipe(
  sequenceS(RE.Apply)({
    ioServiceApiKey: readFromEnvironment("IoServiceApiKey"),
    ioServiceBaseUrl: readFromEnvironment("IoServiceBaseUrl"),
    ioServiceRequestTimeout: pipe(
      readFromEnvironment("IoServiceRequestTimeout"),
      RE.map((value) => Number.parseInt(value, 10)),
    ),
  }),
);
