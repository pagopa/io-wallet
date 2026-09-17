import * as t from "io-ts";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import {
  EntityConfigurationPayload,
  EntityConfigurationV2Payload,
} from "../entity-configuration";
import { removeTrailingSlash } from "../url";

const EntityConfigurationJwtModel = t.type({
  authority_hints: t.array(t.string),
  iss: t.string,
  jwks: t.type({
    keys: t.array(JwkPublicKey),
  }),
  metadata: t.type({
    federation_entity: t.type({
      contacts: t.array(t.string),
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
    jwks,
    sub,
    walletProviderMetadata,
  }) => ({
    authority_hints: authorityHints.map(({ href }) =>
      removeTrailingSlash(href),
    ),
    iss: removeTrailingSlash(iss.href),
    jwks: {
      keys: jwks,
    },
    metadata: {
      federation_entity: {
        contacts: federationEntityMetadata.contacts,
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

const EntityConfigurationV2JwtModel = t.type({
  authority_hints: t.array(t.string),
  iss: t.string,
  jwks: t.type({
    keys: t.array(JwkPublicKey),
  }),
  metadata: t.type({
    federation_entity: t.type({
      contacts: t.array(t.string),
      homepage_uri: t.string,
      logo_uri: t.string,
      organization_name: t.string,
      policy_uri: t.string,
      tos_uri: t.string,
    }),
    wallet_solution: t.type({
      jwks: t.type({
        keys: t.array(JwkPublicKey),
      }),
      logo_uri: t.string,
      wallet_metadata: t.type({
        authorization_endpoint: t.string,
        client_id_prefixes_supported: t.tuple([t.literal("openid_federation")]),
        credential_offer_endpoint: t.string,
        request_object_signing_alg_values_supported: t.tuple([
          t.literal("ES256"),
        ]),
        response_types_supported: t.tuple([t.literal("vp_token")]),
        vp_formats_supported: t.type({
          "dc+sd-jwt": t.type({
            "sd-jwt_alg_values": t.tuple([t.literal("ES256")]),
          }),
          mso_mdoc: t.type({
            deviceauth_alg_values: t.tuple([t.literal(-9)]),
            issuerauth_alg_values: t.tuple([t.literal(-9)]),
          }),
        }),
        wallet_name: t.string,
      }),
    }),
  }),
  sub: t.string,
});

export type EntityConfigurationV2JwtModel = t.TypeOf<
  typeof EntityConfigurationV2JwtModel
>;

export const EntityConfigurationV2ToJwtModel: E.Encoder<
  EntityConfigurationV2JwtModel,
  EntityConfigurationV2Payload
> = {
  encode: ({
    authorityHints,
    federationEntityMetadata,
    iss,
    jwks,
    sub,
    trustMarks,
    walletSolutionMetadata,
  }) => ({
    authority_hints: authorityHints.map(({ href }) =>
      removeTrailingSlash(href),
    ),
    iss: removeTrailingSlash(iss.href),
    jwks: {
      keys: jwks,
    },
    metadata: {
      federation_entity: {
        contacts: federationEntityMetadata.contacts,
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
      wallet_solution: {
        jwks: {
          keys: walletSolutionMetadata.jwks,
        },
        logo_uri: removeTrailingSlash(walletSolutionMetadata.logoUri.href),
        wallet_metadata: {
          authorization_endpoint: removeTrailingSlash(
            walletSolutionMetadata.authorizationEndpoint.href,
          ),
          client_id_prefixes_supported: ["openid_federation"],
          credential_offer_endpoint: removeTrailingSlash(
            walletSolutionMetadata.credentialOfferEndpoint.href,
          ),
          request_object_signing_alg_values_supported: ["ES256"],
          response_types_supported: ["vp_token"],
          vp_formats_supported: {
            "dc+sd-jwt": {
              "sd-jwt_alg_values": ["ES256"],
            },
            mso_mdoc: {
              deviceauth_alg_values: [-9],
              issuerauth_alg_values: [-9],
            },
          },
          wallet_name: walletSolutionMetadata.walletName,
        },
      },
    },
    sub: removeTrailingSlash(sub.href),
    trust_marks: trustMarks.map(({ trustMark, trustMarkType }) => ({
      trust_mark: trustMark,
      trust_mark_type: trustMarkType,
    })),
  }),
};
