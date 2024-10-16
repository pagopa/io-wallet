import * as t from "io-ts";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/Apply";
import { readFromEnvironment } from "io-wallet-common/infra/env";
import * as RE from "fp-ts/ReaderEither";

export const IoServiceConfig = t.type({
    ioServiceBaseUrl: t.string,
    ioServiceApiKey: t.string,
    ioServiceRequestTimeout: t.number
});
  
export type IoServiceConfig = t.TypeOf<typeof IoServiceConfig>;

export const getIoServiceConfigFromEnvironment: RE.ReaderEither<NodeJS.ProcessEnv, Error, IoServiceConfig> =
    pipe(
        sequenceS(RE.Apply)({
            ioServiceBaseUrl: readFromEnvironment("IoServiceBaseUrl"),
            ioServiceApiKey: readFromEnvironment("IoServiceApiKey"),
            ioServiceRequestTimeout: pipe(
                readFromEnvironment("IoServiceRequestTimeout"),
                RE.map(
                    (value) => Number.parseInt(value)
                )
            )
        }),
    );
