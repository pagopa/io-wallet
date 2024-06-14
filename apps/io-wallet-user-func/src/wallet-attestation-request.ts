import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as t from "io-ts";

import { JwkPublicKey } from "./jwk";
import { validate } from "./validation";
import { getPublicKeyFromCnf, verifyJwtSignature } from "./verifier";

export const WalletAttestationRequestHeader = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("war+jwt"),
});

export type WalletAttestationRequestHeader = t.TypeOf<
  typeof WalletAttestationRequestHeader
>;

export const WalletAttestationRequestPayload = t.type({
  challenge: NonEmptyString,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  exp: t.number,
  hardware_key_tag: NonEmptyString,
  hardware_signature: NonEmptyString,
  iat: t.number,
  integrity_assertion: NonEmptyString,
  iss: t.string,
  sub: t.string,
});

export type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

export interface WalletAttestationRequest {
  header: WalletAttestationRequestHeader;
  payload: WalletAttestationRequestPayload;
}

// Verify and extract header and payload from Wallet Attestation Request
export const verifyWalletAttestationRequest = (
  attestationRequestJwt: string,
): TE.TaskEither<Error, WalletAttestationRequest> =>
  pipe(
    attestationRequestJwt,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyJwtSignature(attestationRequestJwt)),
    TE.chainEitherKW((verifiedJwt) =>
      sequenceS(E.Apply)({
        header: pipe(
          verifiedJwt.protectedHeader,
          validate(
            WalletAttestationRequestHeader,
            "Invalid Wallet Attestation Request header",
          ),
        ),
        payload: pipe(
          verifiedJwt.payload,
          validate(
            WalletAttestationRequestPayload,
            "Invalid Wallet Attestation Request payload",
          ),
        ),
      }),
    ),
  );
