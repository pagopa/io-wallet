import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

import { readFromEnvironment } from "../env";
import { WalletProviderMetadata } from "../../wallet-provider";
import { validate } from "../../validation";

export const getWalletProviderConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  WalletProviderMetadata
> = pipe(
  sequenceS(RE.Apply)({
    basePath: readFromEnvironment("WalletProviderBasePath"),
    organizationName: readFromEnvironment("WalletProviderOrganizationName"),
    homePageUri: readFromEnvironment("WalletProviderHomepageUri"),
    policyUri: readFromEnvironment("WalletProviderPolicyUri"),
    tosUri: readFromEnvironment("WalletProviderTosUri"),
    logoUri: readFromEnvironment("WalletProviderLogoUri"),
  }),
  RE.chainEitherKW(
    validate(WalletProviderMetadata, "Wallet provider configuration is invalid")
  )
);
