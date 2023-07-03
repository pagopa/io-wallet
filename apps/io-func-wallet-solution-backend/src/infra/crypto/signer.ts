import * as t from "io-ts";

import { pipe } from "fp-ts/function";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as jose from "jose";

import { Signer } from "../../signer";
import { ECKey, Jwk, RSAKey } from "../../jwk";
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

  // TODO: Make algorithm management separate and not hard-coded
  createJwtAndsign = (typ: string) => (payload: jose.JWTPayload) =>
    pipe(
      getFirstPrivateKeyByAlg(this.#configuration.jwks, "EC"),
      TE.fromOption(() => new Error("No keys found for this algorithm")),
      TE.chain((privateKey) =>
        pipe(
          TE.tryCatch(() => jose.importJWK(privateKey), E.toError),
          TE.map((joseKey) => ({ joseKey, kid: privateKey.kid }))
        )
      ),
      TE.chain(({ joseKey, kid }) =>
        TE.tryCatch(
          () =>
            new jose.SignJWT(payload)
              .setProtectedHeader({ kid, alg: "ES256", typ })
              .setIssuedAt()
              .setExpirationTime("1h")
              .sign(joseKey),
          E.toError
        )
      )
    );

  getSupportedSignAlgorithms = () => E.right(supportedSignAlgorithms);
}

const getFirstPrivateKeyByAlg = (
  jwks: CryptoConfiguration["jwks"],
  alg: Jwk["kty"]
) =>
  pipe(
    jwks,
    A.findFirst((key) => key.kty === alg)
  );
