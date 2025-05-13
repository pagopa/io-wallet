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
