import * as t from "io-ts";

import * as E from "fp-ts/Either";
import * as jose from "jose";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { validate } from "./validation";

import { JwkPublicKey } from "./jwk";

const WithJwkCnf = t.type({
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
});

type WithJwkCnf = t.TypeOf<typeof WithJwkCnf>;

export const decodeJwt = (jwt: string) =>
  E.tryCatch(() => jose.decodeJwt(jwt), E.toError);

export const verifyJwtSignature = (jwt: string) => (publicKey: JwkPublicKey) =>
  pipe(
    TE.tryCatch(() => jose.importJWK(publicKey), E.toError),
    TE.chain((joseKey) =>
      TE.tryCatch(() => jose.jwtVerify(jwt, joseKey), E.toError)
    )
  );

export const getPublicKeyFromCnf = (jwt: string) =>
  pipe(
    jwt,
    decodeJwt,
    E.chainW(
      validate(
        WithJwkCnf,
        "The jwt does not have the cnf attribute with the jwk public key."
      )
    ),
    E.map((payload) => payload.cnf.jwk)
  );
