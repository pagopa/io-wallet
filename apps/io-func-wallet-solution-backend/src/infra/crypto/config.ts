import * as t from "io-ts";

import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

import { readFromEnvironment } from "../env";
import { JWK } from "../../wallet-provider";
import { fromBase64ToJwks } from "../../jwk";

export const CryptoConfiguration = t.type({
  jwks: t.array(JWK),
});

export type CryptoConfiguration = t.TypeOf<typeof CryptoConfiguration>;

export const getCryptoConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  CryptoConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    jwks: pipe(
      readFromEnvironment("WalletKeys"),
      RE.chainEitherKW(fromBase64ToJwks)
    ),
  })
);
