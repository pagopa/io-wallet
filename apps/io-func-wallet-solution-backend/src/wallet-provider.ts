import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as t from "io-ts";

export const WalletProviderMetadata = t.type({
  basePath: UrlFromString,
  organizationName: NonEmptyString,
  homePageUri: UrlFromString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
  logoUri: UrlFromString,
});

export type WalletProviderMetadata = t.TypeOf<typeof WalletProviderMetadata>;

// Level of Agreement

export enum LoA {
  basic = "https://wallet.italia.it/LoA/basic",
  medium = "https://wallet.italia.it/LoA/medium",
  hight = "https://wallet.italia.it/LoA/hight",
}

export const LoAValues = t.union([
  t.literal(LoA.basic),
  t.literal(LoA.medium),
  t.literal(LoA.hight),
]);
export type LoAValues = t.TypeOf<typeof LoAValues>;
