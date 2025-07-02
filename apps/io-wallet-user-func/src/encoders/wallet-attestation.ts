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

// ----- new wallet-attestation endpoint
export interface WalletAttestationData {
  aal: string;
  iss: string;
  kid: string;
  sub: string;
  walletInstancePublicKey: JwkPublicKey;
  walletLink: string;
  walletName: string;
}

interface WalletAttestationJwtModelV2 {
  aal: string;
  cnf: {
    jwk: JwkPublicKey;
  };
  iss: string;
  kid: string;
  sub: string;
  wallet_link: string;
  wallet_name: string;
}

export const WalletAttestationToJwtModelV2: E.Encoder<
  WalletAttestationJwtModelV2,
  WalletAttestationData
> = {
  encode: ({
    aal,
    iss,
    kid,
    sub,
    walletInstancePublicKey,
    walletLink,
    walletName,
  }) => ({
    aal,
    cnf: {
      jwk: walletInstancePublicKey,
    },
    iss: removeTrailingSlash(iss),
    kid,
    sub: removeTrailingSlash(sub),
    wallet_link: walletLink,
    wallet_name: walletName,
  }),
};
