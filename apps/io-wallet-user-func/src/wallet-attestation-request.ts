import { parse } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { getPublicKeyFromCnf, verifyAndDecodeJwt } from "./verifier";

const WalletAttestationRequestHeader = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("wp-war+jwt"),
});

const WalletAttestationRequestPayload = t.type({
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

const WalletAttestationRequest = t.type({
  header: WalletAttestationRequestHeader,
  payload: WalletAttestationRequestPayload,
});

export type WalletAttestationRequest = t.TypeOf<
  typeof WalletAttestationRequest
>;

// verify and decode the wallet instance request
export const verifyAndDecodeWalletAttestationRequest = (
  walletAttestationRequest: string,
): TE.TaskEither<Error, WalletAttestationRequest> =>
  pipe(
    walletAttestationRequest,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyAndDecodeJwt(walletAttestationRequest)),
    TE.chainEitherKW(parse(WalletAttestationRequest)),
  );
