import * as t from "io-ts";

import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";

import { Signer } from "../../signer";
import { ECKey, RSAKey } from "../../jwk";
import { validate } from "../../validation";
import { CryptoConfiguration } from "./config";

const supportedSignAlgorithms = [
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

export class CryptoSigner implements Signer {
  #configuration: CryptoConfiguration;

  constructor(cnf: CryptoConfiguration) {
    this.#configuration = cnf;
  }

  getPublicKeys = () =>
    pipe(
      this.#configuration.jwks,
      validate(
        t.array(t.union([t.exact(ECKey), t.exact(RSAKey)])),
        "JWKs appears to not be a public key array"
      )
    );

  getSupportedSignAlgorithms = () => E.right(supportedSignAlgorithms);
}
