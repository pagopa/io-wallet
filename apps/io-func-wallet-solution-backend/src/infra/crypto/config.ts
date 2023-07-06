import * as t from "io-ts";

import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

import { readFromEnvironment } from "../env";
import { Jwk } from "../../jwk";
import { fromBase64ToJwks } from "../../jwk";

export const CryptoConfiguration = t.type({
  jwks: t.array(Jwk),
  jwtDuration: t.string,
  jwtDefaultAlg: t.string,
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
    jwtDuration: pipe(
      readFromEnvironment("JwtDuration"),
      RE.orElse(() => RE.right("1h"))
    ),
    jwtDefaultAlg: pipe(
      readFromEnvironment("JwtDefaultAlg"),
      RE.orElse(() => RE.right("ES256"))
    ),
  })
);
