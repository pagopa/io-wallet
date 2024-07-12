import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as E from "fp-ts/Either";
import { flow } from "fp-ts/function";

import { FederationEntityMetadata } from "../../../../entity-configuration";

export const url = flow(
  UrlFromString.decode,
  E.getOrElseW((_) => {
    throw new Error(`Failed to parse url ${_[0].value}`);
  }),
);

export const federationEntityMetadata: FederationEntityMetadata = {
  basePath: url("https://wallet-provider.example.org"),
  homePageUri: url("https://wallet-provider.example.org/privacy_policy"),
  logoUri: url("https://wallet-provider.example.org/logo.svg"),
  organizationName: "wallet provider" as NonEmptyString,
  policyUri: url("https://wallet-provider.example.org/info_policy"),
  tosUri: url("https://wallet-provider.example.org/logo.svg"),
};
