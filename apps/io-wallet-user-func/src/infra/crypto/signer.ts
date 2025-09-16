import { parse } from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/function";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { ECKey, Jwk, JwkPrivateKey, RSAKey } from "io-wallet-common/jwk";
import * as jose from "jose";

import { CryptoConfiguration } from "../../app/config";
import { JwtHeader, Signer } from "../../signer";

const supportedSignAlgorithms = ["ES256"];

export class CryptoSigner implements Signer {
  #configuration: CryptoConfiguration;

  constructor(cnf: CryptoConfiguration) {
    this.#configuration = cnf;
  }

  // TODO: [SIW-260] Make algorithm management separate and not hard-coded
  createJwtAndSign =
    (
      header: JwtHeader,
      kid: string,
      alg = this.#configuration.jwtDefaultAlg,
      jwtDuration = this.#configuration.jwtDefaultDuration,
    ) =>
    (payload: jose.JWTPayload) =>
      pipe(
        alg,
        TE.fromPredicate(
          this.isAlgorithmSupported,
          (a) => new Error(`The algorithm ${a} is not supported`),
        ),
        TE.chain((a) =>
          pipe(
            getPrivateKeyByKid(this.#configuration.jwks, kid),
            TE.fromOption(
              () => new Error(`No keys found for the algorithm ${a}`),
            ),
          ),
        ),
        TE.chain((privateKey) =>
          pipe(
            TE.tryCatch(() => jose.importJWK(privateKey), E.toError),
            TE.map((joseKey) => ({ joseKey, kid: privateKey.kid })),
          ),
        ),
        TE.chain(({ joseKey, kid }) =>
          TE.tryCatch(
            () =>
              new jose.SignJWT(payload)
                .setProtectedHeader({
                  ...header,
                  alg,
                  kid,
                })
                .setIssuedAt()
                .setExpirationTime(jwtDuration)
                .sign(joseKey),
            E.toError,
          ),
        ),
      );

  // Return the first public key in Wallet Provider JWKS given the kty
  getFirstPublicKeyByKty = (kty: Jwk["kty"]) =>
    pipe(
      this.getPublicKeys(),
      E.chain(
        flow(
          A.findFirst((key) => key.kty === kty),
          E.fromOption(
            () => new Error(`First public key with kty ${kty} not found`),
          ),
        ),
      ),
    );

  getPrivateKeyByKid = (kid: string): O.Option<JwkPrivateKey> =>
    pipe(
      this.#configuration.jwks,
      A.findFirst((key) => key.kid === kid),
      O.flatMap(
        flow(
          parse(JwkPrivateKey),
          E.match(() => O.none, O.some),
        ),
      ),
    );

  getPublicKeys = () =>
    pipe(
      this.#configuration.jwks,
      parse(
        t.array(t.union([t.exact(ECKey), t.exact(RSAKey)])),
        "JWKs appears to not be a public key array",
      ),
    );

  getSupportedSignAlgorithms = () => E.right(supportedSignAlgorithms);

  isAlgorithmSupported = (alg: string) =>
    pipe(
      supportedSignAlgorithms,
      A.findFirst((supportedAlg) => supportedAlg === alg),
      O.isSome,
    );
}

const getPrivateKeyByKid = (jwks: CryptoConfiguration["jwks"], kid: string) =>
  pipe(
    jwks,
    A.findFirst((key) => key.kid === kid),
  );
