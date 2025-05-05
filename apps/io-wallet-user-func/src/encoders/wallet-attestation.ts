import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { removeTrailingSlash } from "../url";
import { WalletAttestationPayload } from "../wallet-attestation";

const AlgValueSupported = t.type({
  "sd-jwt_alg_values": t.array(t.string),
});

/* WalletAttestationJwtModel is the model of how the Wallet Attestation JWT
 *is represented outside the code base
 */
export const WalletAttestationJwtModel = t.type({
  aal: t.string,
  authorization_endpoint: t.literal("eudiw:"),
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iss: t.string,
  presentation_definition_uri_supported: t.boolean,
  request_object_signing_alg_values_supported: t.array(t.string),
  response_modes_supported: t.array(t.string),
  response_types_supported: t.array(t.string),
  sub: t.string,
  vp_formats_supported: t.type({
    "vc+sd-jwt": AlgValueSupported,
    "vp+sd-jwt": AlgValueSupported,
  }),
});

export type WalletAttestationJwtModel = t.TypeOf<
  typeof WalletAttestationJwtModel
>;

export const WalletAttestationToJwtModel: E.Encoder<
  WalletAttestationJwtModel,
  WalletAttestationPayload
> = {
  encode: ({
    aal,
    algValueSupported,
    federationEntity,
    iss,
    sub,
    walletInstancePublicKey,
  }) => ({
    aal,
    authorization_endpoint: "eudiw:",
    cnf: {
      jwk: walletInstancePublicKey,
    },
    homepage_uri: removeTrailingSlash(federationEntity.homepageUri.href),
    iss: removeTrailingSlash(iss),
    presentation_definition_uri_supported: false,
    request_object_signing_alg_values_supported: ["ES256"],
    response_modes_supported: ["form_post.jwt"],
    response_types_supported: ["vp_token"],
    sub: removeTrailingSlash(sub),
    vp_formats_supported: {
      "vc+sd-jwt": {
        "sd-jwt_alg_values": algValueSupported,
      },
      "vp+sd-jwt": {
        "sd-jwt_alg_values": algValueSupported,
      },
    },
  }),
};

// --------------------
export const WalletAttestationJwtModelV2 = t.type({
  aal: t.string,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iss: t.string,
  sub: t.string,
  wallet_name: t.string, //opzionale
});

export type WalletAttestationJwtModelV2 = t.TypeOf<
  typeof WalletAttestationJwtModelV2
>;

// name
const WalletAttestationJwtPayloadV2 = t.type({
  aal: t.string,
  iss: t.string,
  sub: t.string,
  walletInstancePublicKey: JwkPublicKey,
});

type WalletAttestationJwtPayloadV2 = t.TypeOf<
  typeof WalletAttestationJwtPayloadV2
>;

export const WalletAttestationToJwtModelV2: E.Encoder<
  WalletAttestationJwtModelV2,
  WalletAttestationJwtPayloadV2
> = {
  encode: ({ aal, iss, sub, walletInstancePublicKey }) => ({
    aal,
    cnf: {
      jwk: walletInstancePublicKey,
    },
    iss: removeTrailingSlash(iss),
    sub: removeTrailingSlash(sub),
    wallet_name: "Wallet Solution X by Wonderland State Department", // TODO
  }),
};

// ------------------------- sdjwt
export const WalletAttestationSdJwtModel = t.type({
  aal: t.string,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iss: t.string,
  sub: t.string,
  vct: t.literal("wallet.attestation.example/v1.0"),
  _sd: t.string,
  sd_alg: t.array(t.string),
});

// name
const WalletAttestationSdJwtPayload = t.type({
  aal: t.string,
  iss: t.string,
  sub: t.string,
  walletInstancePublicKey: JwkPublicKey,
});

type WalletAttestationSdJwtPayload = t.TypeOf<
  typeof WalletAttestationSdJwtPayload
>;

export type WalletAttestationSdJwtModel = t.TypeOf<
  typeof WalletAttestationSdJwtModel
>;

export const WalletAttestationToSdJwtModel: E.Encoder<
  WalletAttestationSdJwtModel,
  WalletAttestationSdJwtPayload
> = {
  encode: ({ aal, iss, sub, walletInstancePublicKey }) => ({
    aal,
    cnf: {
      jwk: walletInstancePublicKey,
    },
    iss: removeTrailingSlash(iss),
    sub: removeTrailingSlash(sub),
    vct: "wallet.attestation.example/v1.0",
    sd_alg: ["ES"],
    _sd: "wa", // TODO
  }),
};
