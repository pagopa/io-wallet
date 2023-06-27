import * as t from "io-ts";

import * as RE from "fp-ts/ReaderEither";
import { pipe } from "fp-ts/function";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import { validate } from "./validation";
import {
  GRANT_TYPE_KEY_ATTESTATION,
  LoA,
  RELATIVE_TOKEN_ENDPOINT,
  TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
} from "./wallet-provider";

export const FederationEntityMetadata = t.type({
  basePath: UrlFromString,
  organizationName: NonEmptyString,
  homePageUri: UrlFromString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
  logoUri: UrlFromString,
});

export type FederationEntityMetadata = t.TypeOf<
  typeof FederationEntityMetadata
>;

type EntityConfigurationEnvironment = {
  federationEntityMetadata: FederationEntityMetadata;
  supportedSignAlgorithms: string[];
};

const WalletProviderMetadataPayload = t.type({
  tokenEndpoint: t.string,
  tokenEndpointAuthSigningAlgValuesSupported: t.array(t.string),
  ascValues: t.array(t.string),
  grantTypesSupported: t.array(t.string),
  tokenEndpointAuthMethodsSupported: t.string,
});

export const EntityConfigurationPayload = t.type({
  iss: t.string,
  sub: t.string,
  walletProviderMetadata: WalletProviderMetadataPayload,
  federationEntity: FederationEntityMetadata,
});
export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;

export const getEntityConfiguration =
  (): RE.ReaderEither<
    EntityConfigurationEnvironment,
    Error,
    EntityConfigurationPayload
  > =>
  ({ federationEntityMetadata, supportedSignAlgorithms }) =>
    pipe(
      {
        iss: federationEntityMetadata.basePath.href,
        sub: federationEntityMetadata.basePath.href,
        walletProviderMetadata: {
          tokenEndpoint: new URL(
            RELATIVE_TOKEN_ENDPOINT,
            federationEntityMetadata.basePath.href
          ).href,
          tokenEndpointAuthSigningAlgValuesSupported: supportedSignAlgorithms,
          ascValues: [
            new URL(LoA.basic, federationEntityMetadata.basePath.href).href,
            new URL(LoA.medium, federationEntityMetadata.basePath.href).href,
            new URL(LoA.hight, federationEntityMetadata.basePath.href).href,
          ],
          grantTypesSupported: [GRANT_TYPE_KEY_ATTESTATION],
          tokenEndpointAuthMethodsSupported:
            TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
        },
        federationEntity: federationEntityMetadata,
      },
      validate(
        EntityConfigurationPayload,
        "Invalid entity configuration payload"
      )
    );
