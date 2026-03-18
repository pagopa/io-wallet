import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

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

export const WalletAttestationRequest = t.type({
  header: WalletAttestationRequestHeader,
  payload: WalletAttestationRequestPayload,
});

export type WalletAttestationRequest = t.TypeOf<
  typeof WalletAttestationRequest
>;
