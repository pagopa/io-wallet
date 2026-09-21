import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { SignJwtEnvironment } from "./infra/crypto/signer";
import { KeyRepository } from "./keys";

export const FederationEntityMetadata = t.type({
  contacts: t.array(EmailString),
  homepageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

const FederationEntity = t.intersection([
  t.type({
    basePathV10: UrlFromString,
    basePathV13: UrlFromString,
  }),
  FederationEntityMetadata,
]);

export interface EntityConfigurationEnvironment extends SignJwtEnvironment {
  entityConfiguration: EntityConfiguration;
  intermediatePublishedKeyNames: readonly string[];
  intermediateSigningKeyName: string;
  keyRepository: KeyRepository;
  leafPublishedKeyNames: readonly string[];
}

export type FederationEntity = t.TypeOf<typeof FederationEntity>;

interface EntityConfiguration {
  authorityHints: UrlFromString[];
  federationEntity: FederationEntity;
}

const WalletProviderMetadataPayload = t.type({
  ascValues: t.array(t.string),
  jwks: t.array(JwkPublicKey),
});

export const EntityConfigurationPayload = t.type({
  authorityHints: t.array(UrlFromString),
  federationEntityMetadata: FederationEntityMetadata,
  iss: UrlFromString,
  jwks: t.array(JwkPublicKey),
  sub: UrlFromString,
  walletProviderMetadata: WalletProviderMetadataPayload,
});

export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;
