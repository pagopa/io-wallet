import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";

import { EntityConfigurationPayload } from "../entity-configuration";
import { JwkPublicKey } from "../jwk";
import { removeTrailingSlash } from "../url";

export const EntityConfigurationJwtModel = t.type({
  authority_hints: t.array(t.string),
  iss: t.string,
  jwks: t.type({
    keys: t.array(JwkPublicKey),
  }),
  metadata: t.type({
    federation_entity: t.type({
      homepage_uri: t.string,
      logo_uri: t.string,
      organization_name: t.string,
      policy_uri: t.string,
      tos_uri: t.string,
    }),
    wallet_provider: t.type({
      attested_security_context_values_supported: t.array(t.string),
      grant_types_supported: t.array(t.string),
      jwks: t.type({
        keys: t.array(JwkPublicKey),
      }),
      token_endpoint: t.string,
      token_endpoint_auth_methods_supported: t.array(t.string),
      token_endpoint_auth_signing_alg_values_supported: t.array(t.string),
    }),
  }),
  sub: t.string,
});
export type EntityConfigurationJwtModel = t.TypeOf<
  typeof EntityConfigurationJwtModel
>;

export const EntityConfigurationToJwtModel: E.Encoder<
  EntityConfigurationJwtModel,
  EntityConfigurationPayload
> = {
  encode: ({ federationEntity, iss, sub, walletProviderMetadata }) => ({
    authority_hints: [
      removeTrailingSlash(federationEntity.trustAnchorUri.href),
    ],
    iss: removeTrailingSlash(iss.href),
    jwks: {
      keys: walletProviderMetadata.jwks,
    },
    metadata: {
      federation_entity: {
        homepage_uri: removeTrailingSlash(federationEntity.homepageUri.href),
        logo_uri: removeTrailingSlash(federationEntity.logoUri.href),
        organization_name: federationEntity.organizationName,
        policy_uri: removeTrailingSlash(federationEntity.policyUri.href),
        tos_uri: removeTrailingSlash(federationEntity.tosUri.href),
      },
      wallet_provider: {
        attested_security_context_values_supported:
          walletProviderMetadata.ascValues,
        grant_types_supported: walletProviderMetadata.grantTypesSupported,
        jwks: {
          keys: walletProviderMetadata.jwks,
        },
        token_endpoint: walletProviderMetadata.tokenEndpoint,
        token_endpoint_auth_methods_supported:
          walletProviderMetadata.tokenEndpointAuthMethodsSupported,
        token_endpoint_auth_signing_alg_values_supported:
          walletProviderMetadata.tokenEndpointAuthSigningAlgValuesSupported,
      },
    },
    sub: removeTrailingSlash(sub.href),
  }),
};
