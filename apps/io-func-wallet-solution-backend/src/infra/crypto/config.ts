import * as RE from "fp-ts/lib/ReaderEither";
import * as t from "io-ts";

import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

import { readFromEnvironment } from "../env";

export const supportedSignAlgorithms = [
  "ES256",
  "ES256K",
  "ES384",
  "ES512",
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
];

export const CryptoConfiguration = t.type({
  privateJwkEc: t.string,
  supportedSignAlgorithms: t.array(t.string),
});

export type CryptoConfiguration = t.TypeOf<typeof CryptoConfiguration>;

export const getCryptoConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  CryptoConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    privateJwkEc: readFromEnvironment("PrivateBase64JwkEc"),
    supportedSignAlgorithms: RE.right(supportedSignAlgorithms),
  })
);
