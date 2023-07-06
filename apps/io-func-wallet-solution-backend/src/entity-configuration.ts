import * as t from "io-ts";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";

import {
  GRANT_TYPE_KEY_ATTESTATION,
  LoA,
  RELATIVE_TOKEN_ENDPOINT,
  TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
  getLoAUri,
} from "./wallet-provider";
import { JwkPublicKey } from "./jwk";
import { Signer } from "./signer";
import { EntityConfigurationToJwtModel } from "./encoders/entity-configuration";

// OIDC Federation standard entity metadata
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

export type EntityConfigurationEnvironment = {
  federationEntityMetadata: FederationEntityMetadata;
  signer: Signer;
};

export const FederationEntity = t.type({
  organizationName: t.string,
  homepageUri: t.string,
  policyUri: t.string,
  tosUri: t.string,
  logoUri: t.string,
});

const WalletProviderMetadataPayload = t.type({
  jwks: t.array(JwkPublicKey),
  tokenEndpoint: t.string,
  tokenEndpointAuthSigningAlgValuesSupported: t.array(t.string),
  ascValues: t.array(t.string),
  grantTypesSupported: t.array(t.string),
  tokenEndpointAuthMethodsSupported: t.array(t.string),
});

export const EntityConfigurationPayload = t.type({
  iss: t.string,
  sub: t.string,
  walletProviderMetadata: WalletProviderMetadataPayload,
  federationEntity: FederationEntity,
});

export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;

// Build the JWT body for the entity configuration metadata and return the signed JWT
export const getEntityConfiguration =
  (): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
    pipe(
      sequenceS(E.Apply)({
        jwks: signer.getPublicKeys(),
        supportedSignAlgorithms: signer.getSupportedSignAlgorithms(),
      }),
      E.map(({ jwks, supportedSignAlgorithms }) => ({
        iss: federationEntityMetadata.basePath.href,
        sub: federationEntityMetadata.basePath.href,
        walletProviderMetadata: {
          jwks,
          tokenEndpoint: new URL(
            RELATIVE_TOKEN_ENDPOINT,
            federationEntityMetadata.basePath.href
          ).href,
          tokenEndpointAuthSigningAlgValuesSupported: supportedSignAlgorithms,
          ascValues: [
            pipe(federationEntityMetadata.basePath, getLoAUri(LoA.basic)),
            pipe(federationEntityMetadata.basePath, getLoAUri(LoA.medium)),
            pipe(federationEntityMetadata.basePath, getLoAUri(LoA.hight)),
          ],
          grantTypesSupported: [GRANT_TYPE_KEY_ATTESTATION],
          tokenEndpointAuthMethodsSupported: [
            TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
          ],
        },
        federationEntity: {
          organizationName: federationEntityMetadata.organizationName,
          homepageUri: federationEntityMetadata.homePageUri.href,
          policyUri: federationEntityMetadata.policyUri.href,
          tosUri: federationEntityMetadata.tosUri.href,
          logoUri: federationEntityMetadata.logoUri.href,
        },
      })),
      E.map(EntityConfigurationToJwtModel.encode),
      TE.fromEither,
      TE.chain(signer.createJwtAndsign("entity-statement+jwt"))
    );
