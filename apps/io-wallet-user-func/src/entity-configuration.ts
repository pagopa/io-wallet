import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { Signer } from "./signer";

export const FederationEntityMetadata = t.type({
  homepageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

export const FederationEntity = t.intersection([
  t.type({
    basePath: UrlFromString,
  }),
  FederationEntityMetadata,
]);

type FederationEntity = t.TypeOf<typeof FederationEntity>;

interface EntityConfiguration {
  authorityHints: UrlFromString[];
  federationEntity: FederationEntity;
}

export interface EntityConfigurationEnvironment {
  entityConfiguration: EntityConfiguration;
  signer: Signer;
}

const WalletProviderMetadataPayload = t.type({
  ascValues: t.array(t.string),
  jwks: t.array(JwkPublicKey),
});

export const EntityConfigurationPayload = t.type({
  authorityHints: t.array(UrlFromString),
  federationEntityMetadata: FederationEntityMetadata,
  iss: UrlFromString,
  sub: UrlFromString,
  walletProviderMetadata: WalletProviderMetadataPayload,
});

export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;
