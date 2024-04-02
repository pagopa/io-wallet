import * as t from "io-ts";

import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { validate } from "../validation";
import { FederationEntityMetadata } from "../entity-configuration";

import { readFromEnvironment } from "../infra/env";
import { Jwk, fromBase64ToJwks } from "../jwk";

export const CryptoConfiguration = t.type({
  jwks: t.array(Jwk),
  jwtDefaultDuration: t.string,
  jwtDefaultAlg: t.string,
});

export type CryptoConfiguration = t.TypeOf<typeof CryptoConfiguration>;

export const AttestationServiceConfiguration = t.type({
  iOsBundleIdentifier: t.string,
  iOsTeamIdentifier: t.string,
  androidBundleIdentifier: t.string,
});

export type AttestationServiceConfiguration = t.TypeOf<
  typeof AttestationServiceConfiguration
>;

export const Config = t.type({
  federationEntity: FederationEntityMetadata,
  crypto: CryptoConfiguration,
  attestationService: AttestationServiceConfiguration,
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
  RE.bind(
    "attestationService",
    () => getAttestationServiceConfigFromEnvironment
  ),
  RE.map((config) => ({
    federationEntity: config.federationEntity,
    crypto: config.crypto,
    attestationService: config.attestationService,
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
    trustAnchorUri: readFromEnvironment("FederationEntityTrustAnchorUri"),
  }),
  RE.chainEitherKW(
    validate(
      FederationEntityMetadata,
      "Federation entity configuration is invalid"
    )
  )
);

export const getCryptoConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  CryptoConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    jwks: pipe(
      readFromEnvironment("WalletKeys"),
      RE.chainEitherKW(fromBase64ToJwks)
    ),
    jwtDefaultDuration: pipe(
      readFromEnvironment("JwtDefaultDuration"),
      RE.orElse(() => RE.right("1h"))
    ),
    jwtDefaultAlg: pipe(
      readFromEnvironment("JwtDefaultAlg"),
      RE.orElse(() => RE.right("ES256"))
    ),
  })
);

export const getAttestationServiceConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AttestationServiceConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    iOsBundleIdentifier: pipe(
      readFromEnvironment("IosBundleIdentifier"),
      RE.orElse(() => RE.right("it.pagopa.app.io"))
    ),
    iOsTeamIdentifier: pipe(
      readFromEnvironment("IosTeamIdentifier"),
      RE.orElse(() => RE.right("DSEVY6MV9G"))
    ),
    androidBundleIdentifier: pipe(
      readFromEnvironment("AndroidBundleIdentifier"),
      RE.orElse(() => RE.right("it.pagopa.app.io"))
    ),
  })
);
