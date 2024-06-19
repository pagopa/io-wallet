import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as jose from "jose";
import { Jwk, JwkPublicKey } from "io-wallet-common/jwk";

export type JwtHeader = {
  typ: string;
  x5c?: string[];
  trust_chain?: string[];
};

export type Signer = {
  getPublicKeys: () => E.Either<Error, JwkPublicKey[]>;
  getSupportedSignAlgorithms: () => E.Either<Error, string[]>;
  createJwtAndSign: (
    header: JwtHeader,
    kid: string,
    alg?: string,
    jwtDuration?: string
  ) => (payload: jose.JWTPayload) => TE.TaskEither<Error, string>;
  getFirstPublicKeyByKty: (kty: Jwk["kty"]) => E.Either<Error, JwkPublicKey>;
  isAlgorithmSupported: (alg: string) => boolean;
};
