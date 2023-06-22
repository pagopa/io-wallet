import * as t from "io-ts";

import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import { getWalletProviderConfigFromEnvironment } from "../infra/wallet-provider/config";
import { WalletProviderMetadata } from "../wallet-provider";

export const Config = t.type({
  pagopa: t.type({
    walletProvider: WalletProviderMetadata,
  }),
});

export type Config = t.TypeOf<typeof Config>;

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  RE.Do,
  RE.bind("walletProvider", () => getWalletProviderConfigFromEnvironment),
  RE.map((config) => ({
    pagopa: {
      walletProvider: config.walletProvider,
    },
  }))
);
