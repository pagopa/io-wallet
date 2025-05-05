import { parse } from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";
import * as jose from "jose";

const CnfWithJwk = t.type({
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
});

type CnfWithJwk = t.TypeOf<typeof CnfWithJwk>;

const decodeJwt = (jwt: string) =>
  E.tryCatch(() => jose.decodeJwt(jwt), E.toError);

export const verifyJwtSignature = (jwt: string) => (publicKey: JwkPublicKey) =>
  pipe(
    TE.tryCatch(() => jose.importJWK(publicKey), E.toError),
    TE.chain((joseKey) =>
      TE.tryCatch(() => jose.jwtVerify(jwt, joseKey), E.toError),
    ),
  );

// firma
export const verifyAndDecodeJwt = (jwt: string) => (publicKey: JwkPublicKey) =>
  pipe(
    TE.tryCatch(() => jose.importJWK(publicKey), E.toError),
    TE.chain((joseKey) =>
      pipe(
        TE.tryCatch(() => jose.jwtVerify(jwt, joseKey), E.toError),
        TE.map(({ payload, protectedHeader }) => ({
          header: protectedHeader, // TODO. verifica differenza tra header e protected header
          payload,
        })),
      ),
    ),
  );

export const getPublicKeyFromCnf = (jwt: string) =>
  pipe(
    jwt,
    decodeJwt,
    E.chainW(
      parse(
        CnfWithJwk,
        "The jwt does not have the cnf attribute with the jwk public key.",
      ),
    ),
    E.map((payload) => payload.cnf.jwk),
  );
