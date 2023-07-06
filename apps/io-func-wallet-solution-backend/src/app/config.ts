import * as t from "io-ts";

import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { validate } from "../validation";
import { FederationEntityMetadata } from "../entity-configuration";
import {
  CryptoConfiguration,
  getCryptoConfigFromEnvironment,
} from "../infra/crypto/config";
import { readFromEnvironment } from "../infra/env";

export const Config = t.type({
  federationEntity: FederationEntityMetadata,
  crypto: CryptoConfiguration,
});

export type Config = t.TypeOf<typeof Config>;

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  RE.Do,
  RE.bind("federationEntity", () => getFederationEntityConfigFromEnvironment),
  RE.bind("crypto", () => getCryptoConfigFromEnvironment),
  RE.map((config) => ({
    federationEntity: config.federationEntity,
    crypto: config.crypto,
  }))
);

const getFederationEntityConfigFromEnvironment: RE.ReaderEither<
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
