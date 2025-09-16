import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { CertificateRepository } from "./certificates";
import { Signer } from "./signer";

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
    basePath: UrlFromString,
  }),
  FederationEntityMetadata,
]);

export interface EntityConfigurationEnvironment {
  certificateRepository: CertificateRepository;
  entityConfiguration: EntityConfiguration;
  entityConfigurationSigner: Signer;
  walletAttestationSigner: Signer;
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
