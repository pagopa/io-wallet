import { UrlFromString } from "@pagopa/ts-commons/lib/url";

import { removeTrailingSlash } from "./url";

// Level of Agreement
export enum LoA {
  basic = "LoA/basic",
  hight = "LoA/hight",
  medium = "LoA/medium",
}

export const getLoAUri = (level: LoA) => (basePath: UrlFromString) =>
  removeTrailingSlash(new URL(level, basePath.href).href);

// to be removed
export const GRANT_TYPE_KEY_ATTESTATION =
  "urn:ietf:params:oauth:grant-type:jwt-bearer";

export const TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED = "private_key_jwt";
export const RELATIVE_TOKEN_ENDPOINT = "token";
