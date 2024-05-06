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
  trustAnchorUri: UrlFromString,
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
  homepageUri: UrlFromString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
  logoUri: UrlFromString,
  trustAnchorUri: UrlFromString,
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
  iss: UrlFromString,
  sub: UrlFromString,
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
        publicJwk: signer.getFirstPublicKeyByKty("EC"),
        supportedSignAlgorithms: signer.getSupportedSignAlgorithms(),
      }),
      TE.fromEither,
      TE.chain(({ jwks, publicJwk, supportedSignAlgorithms }) =>
        pipe(
          {
            iss: federationEntityMetadata.basePath,
            sub: federationEntityMetadata.basePath,
            walletProviderMetadata: {
              jwks,
              tokenEndpoint: new URL(
                RELATIVE_TOKEN_ENDPOINT,
                federationEntityMetadata.basePath.href
              ).href,
              tokenEndpointAuthSigningAlgValuesSupported:
                supportedSignAlgorithms,
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
              homepageUri: federationEntityMetadata.homePageUri,
              policyUri: federationEntityMetadata.policyUri,
              tosUri: federationEntityMetadata.tosUri,
              logoUri: federationEntityMetadata.logoUri,
              trustAnchorUri: federationEntityMetadata.trustAnchorUri,
            },
          },
          EntityConfigurationToJwtModel.encode,
          signer.createJwtAndSign(
            { typ: "entity-statement+jwt" },
            publicJwk.kid
          )
        )
      )
    );
