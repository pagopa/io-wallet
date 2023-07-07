import * as t from "io-ts";

import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";

import { JwkPublicKey } from "./jwk";
import { getPublicKeyFromCnf, verifyJwtSignature } from "./verifier";
import { validate } from "./validation";

export const WalletInstanceAttestationRequestHeader = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("var+jwt"),
});

export type WalletInstanceAttestationRequestHeader = t.TypeOf<
  typeof WalletInstanceAttestationRequestHeader
>;

export const WalletInstanceAttestationRequestPayload = t.type({
  iss: t.string,
  sub: t.string,
  jti: t.string,
  type: t.literal("WalletInstanceAttestationRequest"),
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iat: t.number,
  exp: t.number,
});

export type WalletInstanceAttestationRequestPayload = t.TypeOf<
  typeof WalletInstanceAttestationRequestPayload
>;

export const verifyWalletInstanceAttestationRequest = (jwt: string) =>
  pipe(
    jwt,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyJwtSignature(jwt)),
    TE.chainEitherKW((verifiedJwt) =>
      sequenceS(E.Apply)({
        payload: pipe(
          verifiedJwt.payload,
          validate(
            WalletInstanceAttestationRequestPayload,
            "Invalid Wallet Instance Attestation Request payload"
          )
        ),
        header: pipe(
          verifiedJwt.protectedHeader,
          validate(
            WalletInstanceAttestationRequestHeader,
            "Invalid Wallet Instance Attestation Request header"
          )
        ),
      })
    )
  );
