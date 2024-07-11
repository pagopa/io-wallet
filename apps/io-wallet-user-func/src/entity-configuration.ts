import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as t from "io-ts";

import { EntityConfigurationToJwtModel } from "./encoders/entity-configuration";
import { JwkPublicKey, validateJwkKid } from "./jwk";
import { Signer } from "./signer";
import {
  GRANT_TYPE_KEY_ATTESTATION,
  LoA,
  RELATIVE_TOKEN_ENDPOINT,
  TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
  getLoAUri,
} from "./wallet-provider";

// OIDC Federation standard entity metadata
export const FederationEntityMetadata = t.type({
  basePath: UrlFromString,
  homePageUri: UrlFromString,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
  trustAnchorUri: UrlFromString,
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
  trustAnchorUri: UrlFromString,
});

const WalletProviderMetadataPayload = t.type({
  ascValues: t.array(t.string),
  grantTypesSupported: t.array(t.string),
  jwks: t.array(JwkPublicKey),
  tokenEndpoint: t.string,
  tokenEndpointAuthMethodsSupported: t.array(t.string),
  tokenEndpointAuthSigningAlgValuesSupported: t.array(t.string),
});

export const EntityConfigurationPayload = t.type({
  federationEntity: FederationEntity,
  iss: UrlFromString,
  sub: UrlFromString,
  walletProviderMetadata: WalletProviderMetadataPayload,
});

export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;

// Build the JWT body for the entity configuration metadata and return the signed JWT
export const getEntityConfiguration: RTE.ReaderTaskEither<
  EntityConfigurationEnvironment,
  Error,
  string
> = ({ federationEntityMetadata, signer }) =>
  pipe(
    sequenceS(E.Apply)({
      jwks: signer.getPublicKeys(),
      publicJwk: pipe(
        signer.getFirstPublicKeyByKty("EC"),
        E.chainW(validateJwkKid),
      ),
      supportedSignAlgorithms: signer.getSupportedSignAlgorithms(),
    }),
    TE.fromEither,
    TE.chain(({ jwks, publicJwk, supportedSignAlgorithms }) =>
      pipe(
        {
          federationEntity: {
            homepageUri: federationEntityMetadata.homePageUri,
            logoUri: federationEntityMetadata.logoUri,
            organizationName: federationEntityMetadata.organizationName,
            policyUri: federationEntityMetadata.policyUri,
            tosUri: federationEntityMetadata.tosUri,
            trustAnchorUri: federationEntityMetadata.trustAnchorUri,
          },
          iss: federationEntityMetadata.basePath,
          sub: federationEntityMetadata.basePath,
          walletProviderMetadata: {
            ascValues: [
              pipe(federationEntityMetadata.basePath, getLoAUri(LoA.basic)),
              pipe(federationEntityMetadata.basePath, getLoAUri(LoA.medium)),
              pipe(federationEntityMetadata.basePath, getLoAUri(LoA.hight)),
            ],
            grantTypesSupported: [GRANT_TYPE_KEY_ATTESTATION],
            jwks,
            tokenEndpoint: new URL(
              RELATIVE_TOKEN_ENDPOINT,
              federationEntityMetadata.basePath.href,
            ).href,
            tokenEndpointAuthMethodsSupported: [
              TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
            ],
            tokenEndpointAuthSigningAlgValuesSupported: supportedSignAlgorithms,
          },
        },
        EntityConfigurationToJwtModel.encode,
        signer.createJwtAndSign(
          { typ: "entity-statement+jwt" },
          publicJwk.kid,
          "ES256",
          "24h",
        ),
      ),
    ),
  );
