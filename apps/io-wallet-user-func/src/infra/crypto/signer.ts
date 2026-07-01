import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { ECPrivateKeyWithKid } from "io-wallet-common/jwk";
import * as jose from "jose";

export type SignAlgorithm = "ES256" | "ES384" | "ES512";

interface JwtHeader {
  trustChain?: string[];
  typ: string;
  x5c?: string[];
}

interface SignJwtOptions {
  duration?: string;
  header: JwtHeader;
  payload: jose.JWTPayload;
}

export const getSignAlgorithmFromCurve = (crv: string): SignAlgorithm => {
  switch (crv) {
    case "P-256":
      return "ES256";
    case "P-384":
      return "ES384";
    case "P-521":
      return "ES512";
    default:
      throw new Error(`The curve ${crv} is not supported`);
  }
};

export const signJwt =
  (privateKey: ECPrivateKeyWithKid) =>
  ({
    duration = "24h",
    header: { trustChain, ...header },
    payload,
  }: SignJwtOptions) =>
    pipe(
      E.tryCatch(() => getSignAlgorithmFromCurve(privateKey.crv), E.toError),
      TE.fromEither,
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
