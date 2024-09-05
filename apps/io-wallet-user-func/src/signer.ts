import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { Jwk, JwkPublicKey } from "io-wallet-common/jwk";
import * as jose from "jose";

export interface JwtHeader {
  trust_chain?: string[];
  typ: string;
  x5c?: string[];
}

export interface Signer {
  createJwtAndSign: (
    header: JwtHeader,
    kid: string,
    alg?: string,
    jwtDuration?: string,
  ) => (payload: jose.JWTPayload) => TE.TaskEither<Error, string>;
  getFirstPublicKeyByKty: (kty: Jwk["kty"]) => E.Either<Error, JwkPublicKey>;
  getPublicKeys: () => E.Either<Error, JwkPublicKey[]>;
  getSupportedSignAlgorithms: () => E.Either<Error, string[]>;
  isAlgorithmSupported: (alg: string) => boolean;
}
