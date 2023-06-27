import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";

import { readFromEnvironment } from "../env";
import { FederationEntityMetadata } from "../../wallet-provider";
import { validate } from "../../validation";

export const getFederationEntityConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  FederationEntityMetadata
> = pipe(
  sequenceS(RE.Apply)({
    basePath: readFromEnvironment("FederationEntityBasePath"),
    organizationName: readFromEnvironment("FederationEntityOrganizationName"),
    homePageUri: readFromEnvironment("FederationEntityHomepageUri"),
    policyUri: readFromEnvironment("FederationEntityPolicyUri"),
    tosUri: readFromEnvironment("FederationEntityTosUri"),
    logoUri: readFromEnvironment("FederationEntityLogoUri"),
  }),
  RE.chainEitherKW(
    validate(
      FederationEntityMetadata,
      "Federation entity configuration is invalid"
    )
  )
);
