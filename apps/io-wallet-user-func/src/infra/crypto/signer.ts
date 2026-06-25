import { pipe } from "fp-ts/function";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { ECPrivateKeyWithKid } from "io-wallet-common/jwk";
import * as jose from "jose";

const supportedSignAlgorithms = ["ES256"];

interface JwtHeader {
  alg?: string;
  trustChain?: string[];
  typ: string;
  x5c?: string[];
}

interface SignJwtOptions {
  duration?: string;
  header: JwtHeader;
  payload: jose.JWTPayload;
}

const isAlgorithmSupported = (alg: string) =>
  pipe(
    supportedSignAlgorithms,
    A.findFirst((supportedAlg) => supportedAlg === alg),
    O.isSome,
  );

export const signJwt =
  (privateKey: ECPrivateKeyWithKid) =>
  ({
    duration = "24h",
    header: { alg = "ES256", trustChain, ...header },
    payload,
  }: SignJwtOptions) =>
    pipe(
      alg,
      TE.fromPredicate(
        isAlgorithmSupported,
        (a) => new Error(`The algorithm ${a} is not supported`),
      ),
      TE.chain((alg) =>
        pipe(
          TE.tryCatch(() => jose.importJWK(privateKey), E.toError),
          TE.chain((key) =>
            TE.tryCatch(
              () =>
                new jose.SignJWT(payload)
                  .setProtectedHeader({
                    ...header,
                    alg,
                    kid: privateKey.kid,
                    trust_chain: trustChain,
                  })
                  .setIssuedAt()
                  .setExpirationTime(duration)
                  .sign(key),
              E.toError,
            ),
          ),
        ),
      ),
    );
