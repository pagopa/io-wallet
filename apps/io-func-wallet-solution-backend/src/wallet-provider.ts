import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import { removeTrailingSlash } from "./url";

// Level of Agreement
export enum LoA {
  basic = "LoA/basic",
  medium = "LoA/medium",
  hight = "LoA/hight",
}

export const getLoAUri = (level: LoA) => (basePath: UrlFromString) =>
  removeTrailingSlash(new URL(level, basePath.href).href);

export const GRANT_TYPE_KEY_ATTESTATION =
  "urn:ietf:params:oauth:client-assertion-type:jwt-key-attestation";

export const TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED = "private_key_jwt";
export const RELATIVE_TOKEN_ENDPOINT = "token";
