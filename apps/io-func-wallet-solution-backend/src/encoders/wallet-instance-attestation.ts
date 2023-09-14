import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "../jwk";
import { WalletInstanceAttestationPayload } from "../wallet-instance-attestation";
import { removeTrailingSlash } from "../url";

const AlgValueSupported = t.type({
  alg_values_supported: t.array(t.string),
});

/* WalletInstanceAttestationJwtModel is the model of how the Wallet Instance Attestation JWT
 *is represented outside the code base
 */
export const WalletInstanceAttestationJwtModel = t.type({
  iss: t.string,
  sub: t.string,
  attested_security_context: t.string,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  authorization_endpoint: t.literal("eudiw"),
  response_types_supported: t.array(t.string),
  vp_formats_supported: t.type({
    jwt_vp_json: AlgValueSupported,
    jwt_vc_json: AlgValueSupported,
  }),
  request_object_signing_alg_values_supported: t.array(t.string),
  presentation_definition_uri_supported: t.boolean,
});

export type WalletInstanceAttestationJwtModel = t.TypeOf<
  typeof WalletInstanceAttestationJwtModel
>;

export const WalletInstanceAttestationToJwtModel: E.Encoder<
  WalletInstanceAttestationJwtModel,
  WalletInstanceAttestationPayload
> = {
  encode: ({
    iss,
    sub,
    federationEntity,
    attested_security_context,
    walletInstancePublicKey,
    algValueSupported,
  }) => ({
    iss: removeTrailingSlash(iss),
    sub: removeTrailingSlash(sub),
    homepage_uri: removeTrailingSlash(federationEntity.homepageUri.href),
    attested_security_context,
    cnf: {
      jwk: walletInstancePublicKey,
    },
    authorization_endpoint: "eudiw",
    response_types_supported: ["vp_token"],
    vp_formats_supported: {
      jwt_vp_json: {
        alg_values_supported: algValueSupported,
      },
      jwt_vc_json: {
        alg_values_supported: algValueSupported,
      },
    },
    request_object_signing_alg_values_supported: ["ES256"],
    presentation_definition_uri_supported: false,
  }),
};
