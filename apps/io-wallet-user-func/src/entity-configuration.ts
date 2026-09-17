import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

const FederationEntityMetadata = t.type({
  contacts: t.array(EmailString),
  homepageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

export type FederationEntityMetadata = t.TypeOf<
  typeof FederationEntityMetadata
>;

const FederationEntity = t.intersection([
  t.type({
    basePathV1: UrlFromString,
    basePathV2: UrlFromString,
  }),
  FederationEntityMetadata,
]);

export type FederationEntity = t.TypeOf<typeof FederationEntity>;

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

const FederationEntityV2Metadata = t.type({
  contacts: t.array(EmailString),
  homepageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

const WalletSolutionMetadataPayload = t.type({
  authorizationEndpoint: UrlFromString,
  credentialOfferEndpoint: UrlFromString,
  jwks: t.array(JwkPublicKey),
  logoUri: UrlFromString,
  walletName: t.string,
});

const TrustMarkPayload = t.type({
  trustMark: t.string,
  trustMarkType: t.string,
});

export const EntityConfigurationV2Payload = t.type({
  authorityHints: t.array(UrlFromString),
  federationEntityMetadata: FederationEntityV2Metadata,
  iss: UrlFromString,
  jwks: t.array(JwkPublicKey),
  sub: UrlFromString,
  trustMarks: t.array(TrustMarkPayload),
  walletSolutionMetadata: WalletSolutionMetadataPayload,
});

export type EntityConfigurationV2Payload = t.TypeOf<
  typeof EntityConfigurationV2Payload
>;
