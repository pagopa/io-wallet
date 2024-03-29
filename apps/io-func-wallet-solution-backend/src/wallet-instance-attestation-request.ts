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
  typ: t.literal("war+jwt"),
});

export type WalletInstanceAttestationRequestHeader = t.TypeOf<
  typeof WalletInstanceAttestationRequestHeader
>;

export const WalletInstanceAttestationRequestPayload = t.type({
  iss: t.string,
  aud: t.string,
  challenge: t.string,
  hardware_signature: t.string,
  integrity_assertion: t.string,
  hardware_key_tag: t.string,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iat: t.number,
  exp: t.number,
});

export type WalletInstanceAttestationRequestPayload = t.TypeOf<
  typeof WalletInstanceAttestationRequestPayload
>;

type WalletInstanceAttestationRequest = {
  header: WalletInstanceAttestationRequestHeader;
  payload: WalletInstanceAttestationRequestPayload;
};

// Verify and extract header and payload from Wallet Instance Attestation Request
export const verifyWalletInstanceAttestationRequest = (
  jwt: string
): TE.TaskEither<Error, WalletInstanceAttestationRequest> =>
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
