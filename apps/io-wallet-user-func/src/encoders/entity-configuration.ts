import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { EntityConfigurationPayload } from "../entity-configuration";
import { removeTrailingSlash } from "../url";

const EntityConfigurationJwtModel = t.type({
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
      aal_values_supported: t.array(t.string),
      jwks: t.type({
        keys: t.array(JwkPublicKey),
      }),
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
  encode: ({
    authorityHints,
    federationEntityMetadata,
    iss,
    sub,
    walletProviderMetadata,
  }) => ({
    // authority_hints: authorityHints.map(({ href }) =>
    //   removeTrailingSlash(href),
    // ),
    authority_hints: authorityHints.map(removeTrailingSlash),
    iss: removeTrailingSlash(iss.href),
    jwks: {
      keys: walletProviderMetadata.jwks,
    },
    metadata: {
      federation_entity: {
        homepage_uri: removeTrailingSlash(
          federationEntityMetadata.homepageUri.href,
        ),
        logo_uri: removeTrailingSlash(federationEntityMetadata.logoUri.href),
        organization_name: federationEntityMetadata.organizationName,
        policy_uri: removeTrailingSlash(
          federationEntityMetadata.policyUri.href,
        ),
        tos_uri: removeTrailingSlash(federationEntityMetadata.tosUri.href),
      },
      wallet_provider: {
        aal_values_supported: walletProviderMetadata.ascValues,
        jwks: {
          keys: walletProviderMetadata.jwks,
        },
      },
    },
    sub: removeTrailingSlash(sub.href),
  }),
};
