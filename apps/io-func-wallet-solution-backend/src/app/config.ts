import * as t from "io-ts";

import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import { getFederationEntityConfigFromEnvironment } from "../infra/federation-entity/config";
import { FederationEntityMetadata } from "../wallet-provider";
import {
  CryptoConfiguration,
  getCryptoConfigFromEnvironment,
} from "../infra/crypto/config";

export const Config = t.type({
  pagopa: t.type({
    federationEntity: FederationEntityMetadata,
    crypto: CryptoConfiguration,
  }),
});

export type Config = t.TypeOf<typeof Config>;

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  RE.Do,
  RE.bind("federationEntity", () => getFederationEntityConfigFromEnvironment),
  RE.bind("crypto", () => getCryptoConfigFromEnvironment),
  RE.map((config) => ({
    pagopa: {
      federationEntity: config.federationEntity,
      crypto: config.crypto,
    },
  }))
);
