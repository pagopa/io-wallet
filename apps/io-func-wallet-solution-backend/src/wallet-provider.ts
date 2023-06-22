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
