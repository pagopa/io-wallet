import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { removeTrailingSlash } from "../url";
import { WalletAttestationPayload } from "../wallet-attestation";

const AlgValueSupported = t.type({
  alg_values_supported: t.array(t.string),
});

/* WalletAttestationJwtModel is the model of how the Wallet Attestation JWT
 *is represented outside the code base
 */
export const WalletAttestationJwtModel = t.type({
  attested_security_context: t.string,
  authorization_endpoint: t.literal("eudiw"),
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  iss: t.string,
  presentation_definition_uri_supported: t.boolean,
  request_object_signing_alg_values_supported: t.array(t.string),
  response_types_supported: t.array(t.string),
  sub: t.string,
  vp_formats_supported: t.type({
    jwt_vc_json: AlgValueSupported,
    jwt_vp_json: AlgValueSupported,
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
    algValueSupported,
    attested_security_context,
    federationEntity,
    iss,
    sub,
    walletInstancePublicKey,
  }) => ({
    attested_security_context,
    authorization_endpoint: "eudiw",
    cnf: {
      jwk: walletInstancePublicKey,
    },
    homepage_uri: removeTrailingSlash(federationEntity.homepageUri.href),
    iss: removeTrailingSlash(iss),
    presentation_definition_uri_supported: false,
    request_object_signing_alg_values_supported: ["ES256"],
    response_types_supported: ["vp_token"],
    sub: removeTrailingSlash(sub),
    vp_formats_supported: {
      jwt_vc_json: {
        alg_values_supported: algValueSupported,
      },
      jwt_vp_json: {
        alg_values_supported: algValueSupported,
      },
    },
  }),
};
