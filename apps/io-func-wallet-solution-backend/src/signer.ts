import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as jose from "jose";
import { JwkPublicKey } from "./jwk";

export type Signer = {
  getPublicKeys: () => E.Either<Error, JwkPublicKey[]>;
  getSupportedSignAlgorithms: () => E.Either<Error, string[]>;
  sign: (
    typ: string
  ) => (payload: jose.JWTPayload) => TE.TaskEither<Error, string>;
};
