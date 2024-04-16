import * as t from "io-ts";

import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
import { sequenceS } from "fp-ts/lib/Apply";
import { validate } from "../validation";
import { FederationEntityMetadata } from "../entity-configuration";

import { readFromEnvironment } from "../infra/env";
import { Jwk, fromBase64ToJwks } from "../jwk";

export const APPLE_APP_ATTESTATION_ROOT_CA =
  "-----BEGIN CERTIFICATE-----\nMIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYwJAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNaFw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlvbiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdhNbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9auYen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijVoyFraWVIyd/dganmrduC1bmTBGwD\n-----END CERTIFICATE-----";

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
  appleRootCertificate: t.string,
  allowDevelopmentEnvironment: t.boolean,
});

export type AttestationServiceConfiguration = t.TypeOf<
  typeof AttestationServiceConfiguration
>;

const AzureConfiguration = t.type({
  cosmos: t.type({
    connectionString: t.string,
    dbName: t.string,
  }),
});

type AzureConfiguration = t.TypeOf<typeof AzureConfiguration>;

export const Config = t.type({
  federationEntity: FederationEntityMetadata,
  crypto: CryptoConfiguration,
  attestationService: AttestationServiceConfiguration,
  azure: AzureConfiguration,
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
  RE.bind("azure", () => getAzureConfigFromEnvironment),
  RE.map(({  federationEntity, crypto, attestationService, azure }) => ({
    federationEntity,
    crypto,
    attestationService,
    azure,
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
    appleRootCertificate: pipe(
      readFromEnvironment("AppleRootCertificate"),
      RE.orElse(() => RE.right(APPLE_APP_ATTESTATION_ROOT_CA))
    ),
    androidBundleIdentifier: pipe(
      readFromEnvironment("AndroidBundleIdentifier"),
      RE.orElse(() => RE.right("it.pagopa.app.io"))
    ),
    allowDevelopmentEnvironment: pipe(
      readFromEnvironment("AllowDevelopmentEnvironment"),
      RE.map(
        (devAllowedString) =>
          devAllowedString === "true" || devAllowedString === "1"
      ),
      RE.orElse(() => RE.right(false))
    ),
  })
);

export const getAzureConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    cosmosDbConnectionString: readFromEnvironment("CosmosDbConnectionString"),
    cosmosDbDatabaseName: readFromEnvironment("CosmosDbDatabaseName"),
  }),
  RE.map(({ cosmosDbConnectionString, cosmosDbDatabaseName }) => ({
    cosmos: {
      connectionString: cosmosDbConnectionString,
      dbName: cosmosDbDatabaseName,
    },
  }))
);
