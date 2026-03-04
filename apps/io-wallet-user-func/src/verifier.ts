import { parse } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";
import * as jose from "jose";

const WithJwkCnf = t.type({
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
});

type WithJwkCnf = t.TypeOf<typeof WithJwkCnf>;

const decodeJwt = (jwt: string) =>
  E.tryCatch(() => jose.decodeJwt(jwt), E.toError);

export const getPublicKeyFromCnf = (jwt: string) =>
  pipe(
    jwt,
    decodeJwt,
    E.chainW(
      parse(
        WithJwkCnf,
        "The jwt does not have the cnf attribute with the jwk public key.",
      ),
    ),
    E.map((payload) => payload.cnf.jwk),
  );

export const verifyAndDecodeJwt = (jwt: string) => (publicKey: JwkPublicKey) =>
  pipe(
    TE.tryCatch(() => jose.importJWK(publicKey), E.toError),
    TE.chain((joseKey) =>
      pipe(
        TE.tryCatch(() => jose.jwtVerify(jwt, joseKey), E.toError),
        TE.map(({ payload, protectedHeader }) => ({
          header: protectedHeader,
          payload,
        })),
      ),
    ),
  );

export const verifyJwtWithInternalKey = (jwt: string) =>
  pipe(
    jwt,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyAndDecodeJwt(jwt)),
  );

interface WithHeaderKidAndPayloadCnfJwkKid {
  header: {
    kid: string;
  };
  payload: {
    cnf: {
      jwk: {
        kid: string;
      };
    };
  };
}

interface WithIssuerAndHardwareKeyTag {
  hardwareKeyTag: NonEmptyString;
  iss: NonEmptyString;
}

export const validateIssuerMatchesHardwareKeyTag = <
  T extends WithIssuerAndHardwareKeyTag,
>(
  jwt: T,
): E.Either<Error, void> =>
  jwt.iss === jwt.hardwareKeyTag
    ? E.right(undefined)
    : E.left(
        new Error(
          "Invalid jwt: payload.iss must match payload.hardware_key_tag",
        ),
      );

export const validateHeaderKidMatchesCnfKid = <
  T extends WithHeaderKidAndPayloadCnfJwkKid,
>(
  jwt: T,
): E.Either<Error, void> =>
  jwt.payload.cnf.jwk.kid === jwt.header.kid
    ? E.right(undefined)
    : E.left(
        new Error("Invalid jwt: header.kid must match payload.cnf.jwk.kid"),
      );
