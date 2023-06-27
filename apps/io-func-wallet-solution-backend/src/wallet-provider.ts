import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";

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

// Level of Agreement
export enum LoA {
  basic = "LoA/basic",
  medium = "LoA/medium",
  hight = "LoA/hight",
}

export const GRANT_TYPE_KEY_ATTESTATION =
  "urn:ietf:params:oauth:client-assertion-type:jwt-key-attestation";

export const TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED = "private_key_jwt";
export const RELATIVE_TOKEN_ENDPOINT = "token";
