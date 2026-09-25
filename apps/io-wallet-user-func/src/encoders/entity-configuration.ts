import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { removeTrailingSlash } from "../url";

interface EntityConfigurationJwtModel {
  authority_hints: string[];
  iss: string;
  jwks: {
    keys: JwkPublicKey[];
  };
  metadata: {
    federation_entity: {
      contacts: string[];
      homepage_uri: string;
      logo_uri: string;
      organization_name: string;
      policy_uri: string;
      tos_uri: string;
    };
    wallet_provider: {
      aal_values_supported: string[];
      jwks: {
        keys: JwkPublicKey[];
      };
    };
  };
  sub: string;
}

interface EntityConfigurationPayload {
  authorityHints: UrlFromString[];
  federationEntityMetadata: {
    contacts: EmailString[];
    homepageUri: UrlFromString;
    logoUri: UrlFromString;
    organizationName: NonEmptyString;
    policyUri: UrlFromString;
    tosUri: UrlFromString;
  };
  iss: UrlFromString;
  jwks: JwkPublicKey[];
  sub: UrlFromString;
  walletProviderMetadata: {
    ascValues: string[];
    jwks: JwkPublicKey[];
  };
}

interface EntityConfigurationV2Payload {
  authorityHints: UrlFromString[];
  federationEntityMetadata: {
    contacts: EmailString[];
    homepageUri: UrlFromString;
    logoUri: UrlFromString;
    organizationName: NonEmptyString;
    policyUri: UrlFromString;
    tosUri: UrlFromString;
  };
  iss: UrlFromString;
  jwks: JwkPublicKey[];
  sub: UrlFromString;
  trustMarks: {
    trustMark: string;
    trustMarkType: string;
  }[];
  walletSolutionMetadata: {
    authorizationEndpoint: UrlFromString;
    credentialOfferEndpoint: UrlFromString;
    jwks: JwkPublicKey[];
    logoUri: UrlFromString;
    walletName: string;
  };
}

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

interface EntityConfigurationV2JwtModel {
  authority_hints: string[];
  iss: string;
  jwks: {
    keys: JwkPublicKey[];
  };
  metadata: {
    federation_entity: {
      contacts: string[];
      homepage_uri: string;
      logo_uri: string;
      organization_name: string;
      policy_uri: string;
      tos_uri: string;
    };
    wallet_solution: {
      jwks: {
        keys: JwkPublicKey[];
      };
      logo_uri: string;
      wallet_metadata: {
        authorization_endpoint: string;
        client_id_prefixes_supported: ["openid_federation"];
        credential_offer_endpoint: string;
        request_object_signing_alg_values_supported: ["ES256"];
        response_types_supported: ["vp_token"];
        vp_formats_supported: {
          "dc+sd-jwt": {
            "sd-jwt_alg_values": ["ES256"];
          };
          mso_mdoc: {
            deviceauth_alg_values: [-9];
            issuerauth_alg_values: [-9];
          };
        };
        wallet_name: string;
      };
    };
  };
  sub: string;
}

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
