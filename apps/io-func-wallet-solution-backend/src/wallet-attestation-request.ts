import * as t from "io-ts";

import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { JwkPublicKey } from "./jwk";
import { getPublicKeyFromCnf, verifyJwtSignature } from "./verifier";
import { validate } from "./validation";

export const WalletAttestationRequestHeader = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("war+jwt"),
});

export type WalletAttestationRequestHeader = t.TypeOf<
  typeof WalletAttestationRequestHeader
>;

export const WalletAttestationRequestPayload = t.type({
  iss: t.string,
  sub: t.string,
  challenge: NonEmptyString,
  hardware_signature: NonEmptyString,
  integrity_assertion: NonEmptyString,
  hardware_key_tag: NonEmptyString,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iat: t.number,
  exp: t.number,
});

export type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

export type WalletAttestationRequest = {
  header: WalletAttestationRequestHeader;
  payload: WalletAttestationRequestPayload;
};

// Verify and extract header and payload from Wallet Attestation Request
export const verifyWalletAttestationRequest = (
  attestationRequestJwt: string
): TE.TaskEither<Error, WalletAttestationRequest> =>
  pipe(
    attestationRequestJwt,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyJwtSignature(attestationRequestJwt)),
    TE.chainEitherKW((verifiedJwt) =>
      sequenceS(E.Apply)({
        payload: pipe(
          verifiedJwt.payload,
          validate(
            WalletAttestationRequestPayload,
            "Invalid Wallet Attestation Request payload"
          )
        ),
        header: pipe(
          verifiedJwt.protectedHeader,
          validate(
            WalletAttestationRequestHeader,
            "Invalid Wallet Attestation Request header"
          )
        ),
      })
    )
  );
