import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { Signer } from "./signer";

// OIDC Federation standard entity metadata
export const FederationEntityMetadata = t.type({
  basePath: UrlFromString,
  homePageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

export type FederationEntityMetadata = t.TypeOf<
  typeof FederationEntityMetadata
>;

export interface EntityConfigurationEnvironment {
  federationEntityMetadata: FederationEntityMetadata;
  signer: Signer;
}

export const FederationEntity = t.type({
  homepageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: t.string,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

const WalletProviderMetadataPayload = t.type({
  ascValues: t.array(t.string),
  jwks: t.array(JwkPublicKey),
});

export const EntityConfigurationPayload = t.type({
  authorityHints: t.array(t.string), // t.array(UrlFromString),
  federationEntity: FederationEntity,
  iss: UrlFromString,
  sub: UrlFromString,
  walletProviderMetadata: WalletProviderMetadataPayload,
});

export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;
