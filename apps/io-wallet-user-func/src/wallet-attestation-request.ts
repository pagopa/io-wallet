import { parse } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import {
  getPublicKeyFromCnf,
  verifyAndDecodeJwt,
  verifyJwtSignature,
} from "./verifier";

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

export interface WalletAttestationRequest {
  header: WalletAttestationRequestHeader;
  payload: WalletAttestationRequestPayload;
}

export type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

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
          parse(
            WalletAttestationRequestHeader,
            "Invalid Wallet Attestation Request header",
          ),
        ),
        payload: pipe(
          verifiedJwt.payload,
          parse(
            WalletAttestationRequestPayload,
            "Invalid Wallet Attestation Request payload",
          ),
        ),
      }),
    ),
  );

// ----- new wallet-attestation endpoint
const WalletAttestationRequestHeaderV2 = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("wp-war+jwt"),
});

const WalletAttestationRequestPayloadV2 = t.type({
  aud: NonEmptyString,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  exp: t.number,
  hardware_key_tag: NonEmptyString,
  hardware_signature: NonEmptyString,
  iat: t.number,
  integrity_assertion: NonEmptyString,
  iss: t.string,
  nonce: NonEmptyString,
});

const WalletAttestationRequestV2 = t.type({
  header: WalletAttestationRequestHeaderV2,
  payload: WalletAttestationRequestPayloadV2,
});

export type WalletAttestationRequestV2 = t.TypeOf<
  typeof WalletAttestationRequestV2
>;

// verify and decode the wallet instance request
export const verifyAndDecodeWalletAttestationRequest = (
  walletAttestationRequest: string,
): TE.TaskEither<Error, WalletAttestationRequestV2> =>
  pipe(
    walletAttestationRequest,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyAndDecodeJwt(walletAttestationRequest)),
    TE.chainEitherKW(parse(WalletAttestationRequestV2)),
  );
