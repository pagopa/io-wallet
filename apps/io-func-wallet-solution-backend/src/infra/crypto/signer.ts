import * as t from "io-ts";

import { pipe, flow } from "fp-ts/function";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as jose from "jose";

import { JwtHeader, Signer } from "../../signer";
import { ECKey, Jwk, RSAKey } from "../../jwk";
import { validate } from "../../validation";
import { CryptoConfiguration } from "../../app/config";

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

  // TODO: [SIW-260] Make algorithm management separate and not hard-coded
  createJwtAndsign =
    (
      header: JwtHeader,
      kid: string,
      jwtDuration = this.#configuration.jwtDuration
    ) =>
    (payload: jose.JWTPayload) =>
      pipe(
        getPrivateKeyByKid(this.#configuration.jwks, kid),
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
                .setProtectedHeader({
                  ...header,
                  kid,
                  alg: this.#configuration.jwtDefaultAlg,
                })
                .setIssuedAt()
                .setExpirationTime(jwtDuration)
                .sign(joseKey),
            E.toError
          )
        )
      );

  getSupportedSignAlgorithms = () => E.right(supportedSignAlgorithms);

  // Return the first public key in Wallet Provider JWKS given the kty
  getFirstPublicKeyByKty = (kty: Jwk["kty"]) =>
    pipe(
      this.getPublicKeys(),
      E.chain(
        flow(
          A.findFirst((key) => key.kty === kty),
          E.fromOption(
            () => new Error(`First public key with kty ${kty} not found`)
          )
        )
      )
    );
}

const getPrivateKeyByKid = (jwks: CryptoConfiguration["jwks"], kid: string) =>
  pipe(
    jwks,
    A.findFirst((key) => key.kid === kid)
  );
