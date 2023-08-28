import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "../jwk";
import { EntityConfigurationPayload } from "../entity-configuration";
import { removeTrailingSlash } from "../url";

export const EntityConfigurationJwtModel = t.type({
  iss: t.string,
  sub: t.string,
  authority_hints: t.array(t.string),
  jwks: t.type({
    keys: t.array(JwkPublicKey),
  }),
  metadata: t.type({
    wallet_provider: t.type({
      jwks: t.type({
        keys: t.array(JwkPublicKey),
      }),
      token_endpoint: t.string,
      asc_values_supported: t.array(t.string),
      grant_types_supported: t.array(t.string),
      token_endpoint_auth_methods_supported: t.array(t.string),
      token_endpoint_auth_signing_alg_values_supported: t.array(t.string),
    }),
    federation_entity: t.type({
      organization_name: t.string,
      homepage_uri: t.string,
      policy_uri: t.string,
      tos_uri: t.string,
      logo_uri: t.string,
    }),
  }),
});
export type EntityConfigurationJwtModel = t.TypeOf<
  typeof EntityConfigurationJwtModel
>;

export const EntityConfigurationToJwtModel: E.Encoder<
  EntityConfigurationJwtModel,
  EntityConfigurationPayload
> = {
  encode: ({ iss, sub, walletProviderMetadata, federationEntity }) => ({
    iss: removeTrailingSlash(iss.href),
    sub: removeTrailingSlash(sub.href),
    authority_hints: [
      removeTrailingSlash(federationEntity.trustAnchorUri.href),
    ],
    jwks: {
      keys: walletProviderMetadata.jwks,
    },
    metadata: {
      wallet_provider: {
        jwks: {
          keys: walletProviderMetadata.jwks,
        },
        token_endpoint: walletProviderMetadata.tokenEndpoint,
        asc_values_supported: walletProviderMetadata.ascValues,
        grant_types_supported: walletProviderMetadata.grantTypesSupported,
        token_endpoint_auth_methods_supported:
          walletProviderMetadata.tokenEndpointAuthMethodsSupported,
        token_endpoint_auth_signing_alg_values_supported:
          walletProviderMetadata.tokenEndpointAuthSigningAlgValuesSupported,
      },
      federation_entity: {
        organization_name: federationEntity.organizationName,
        homepage_uri: removeTrailingSlash(federationEntity.homepageUri.href),
        policy_uri: removeTrailingSlash(federationEntity.policyUri.href),
        tos_uri: removeTrailingSlash(federationEntity.tosUri.href),
        logo_uri: removeTrailingSlash(federationEntity.logoUri.href),
      },
    },
  }),
};
