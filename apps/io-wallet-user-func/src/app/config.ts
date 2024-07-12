import { readFromEnvironment } from "@/infra/env";
import { Jwk, fromBase64ToJwks } from "@/jwk";
import { parse } from "@pagopa/handler-kit";
import { readableReportSimplified } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { FederationEntityMetadata } from "../entity-configuration";

const booleanFromString = (input: string) =>
  input === "true" || input === "1" || input === "yes";

export const APPLE_APP_ATTESTATION_ROOT_CA =
  "-----BEGIN CERTIFICATE-----\nMIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYwJAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNaFw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlvbiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdhNbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9auYen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijVoyFraWVIyd/dganmrduC1bmTBGwD\n-----END CERTIFICATE-----";

export const GOOGLE_PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xU\nFmOr75gvMsd/dTEDDJdSSxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5j\nlRfdnJLmN0pTy/4lj4/7tv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y\n//0rb+T+W8a9nsNL/ggjnar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73X\npXyTqRxB/M0n1n/W9nGqC4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYI\nmQQcHtGl/m00QLVWutHQoVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB\n+TxywElgS70vE0XmLD+OJtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7q\nuvmag8jfPioyKvxnK/EgsTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgp\nZrt3i5MIlCaY504LzSRiigHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7\ngLiMm0jhO2B6tUXHI/+MRPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82\nixPvZtXQpUpuL12ab+9EaDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+\nNpUFgNPN9PvQi8WEg5UmAGMCAwEAAQ==\n-----END PUBLIC KEY-----";

/**
 * Certificate Revocation status List
 * https://developer.android.com/privacy-and-security/security-key-attestation#certificate_status
 */
export const ANDROID_CRL_URL =
  "https://android.googleapis.com/attestation/status";

export const ANDROID_PLAY_INTEGRITY_URL =
  "https://www.googleapis.com/auth/playintegrity";

export const CryptoConfiguration = t.type({
  jwks: t.array(Jwk),
  jwtDefaultAlg: t.string,
  jwtDefaultDuration: t.string,
});

export type CryptoConfiguration = t.TypeOf<typeof CryptoConfiguration>;

export const AttestationServiceConfiguration = t.type({
  allowDevelopmentEnvironment: t.boolean,
  androidBundleIdentifier: t.string,
  androidCrlUrl: t.string,
  androidPlayIntegrityUrl: t.string,
  androidPlayStoreCertificateHash: t.string,
  appleRootCertificate: t.string,
  googleAppCredentialsEncoded: t.string,
  googlePublicKey: t.string,
  iOsBundleIdentifier: t.string,
  iOsTeamIdentifier: t.string,
  skipSignatureValidation: t.boolean,
});

export type AttestationServiceConfiguration = t.TypeOf<
  typeof AttestationServiceConfiguration
>;

const AzureConfiguration = t.type({
  cosmos: t.type({
    dbName: t.string,
    endpoint: t.string,
  }),
  storage: t.type({
    entityConfiguration: t.type({ containerName: t.string }),
  }),
});

type AzureConfiguration = t.TypeOf<typeof AzureConfiguration>;

export const PdvTokenizerApiClientConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  testUUID: t.string,
});

export type PdvTokenizerApiClientConfig = t.TypeOf<
  typeof PdvTokenizerApiClientConfig
>;

const HubSpidLoginConfig = t.type({
  clientBaseUrl: NonEmptyString,
  jwtIssuer: NonEmptyString,
  jwtPubKey: NonEmptyString,
});

export type HubSpidLoginConfig = t.TypeOf<typeof HubSpidLoginConfig>;

const TrialSystemApiClientConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  featureFlag: t.string,
  trialId: t.string,
});

export type TrialSystemApiClientConfig = t.TypeOf<
  typeof TrialSystemApiClientConfig
>;

export const Config = t.type({
  attestationService: AttestationServiceConfiguration,
  azure: AzureConfiguration,
  crypto: CryptoConfiguration,
  federationEntity: FederationEntityMetadata,
  hubSpidLogin: HubSpidLoginConfig,
  pdvTokenizer: PdvTokenizerApiClientConfig,
  trialSystem: TrialSystemApiClientConfig,
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
    () => getAttestationServiceConfigFromEnvironment,
  ),
  RE.bind("azure", () => getAzureConfigFromEnvironment),
  RE.bind("pdvTokenizer", () => getPdvTokenizerConfigFromEnvironment),
  RE.bind("hubSpidLogin", () => getHubSpidLoginConfigFromEnvironment),
  RE.bind("trialSystem", () => getTrialSystemConfigFromEnvironment),
  RE.map(
    ({
      attestationService,
      azure,
      crypto,
      federationEntity,
      hubSpidLogin,
      pdvTokenizer,
      trialSystem,
    }) => ({
      attestationService,
      azure,
      crypto,
      federationEntity,
      hubSpidLogin,
      pdvTokenizer,
      trialSystem,
    }),
  ),
);

const getFederationEntityConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  FederationEntityMetadata
> = pipe(
  sequenceS(RE.Apply)({
    basePath: readFromEnvironment("FederationEntityBasePath"),
    homePageUri: readFromEnvironment("FederationEntityHomepageUri"),
    logoUri: readFromEnvironment("FederationEntityLogoUri"),
    organizationName: readFromEnvironment("FederationEntityOrganizationName"),
    policyUri: readFromEnvironment("FederationEntityPolicyUri"),
    tosUri: readFromEnvironment("FederationEntityTosUri"),
  }),
  RE.chainEitherKW(
    parse(
      FederationEntityMetadata,
      "Federation entity configuration is invalid",
    ),
  ),
);

export const getCryptoConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  CryptoConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    jwks: pipe(
      readFromEnvironment("WalletKeys"),
      RE.chainEitherKW(fromBase64ToJwks),
    ),
    jwtDefaultAlg: pipe(
      readFromEnvironment("JwtDefaultAlg"),
      RE.orElse(() => RE.right("ES256")),
    ),
    jwtDefaultDuration: pipe(
      readFromEnvironment("JwtDefaultDuration"),
      RE.orElse(() => RE.right("1h")),
    ),
  }),
);

export const getAttestationServiceConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AttestationServiceConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    allowDevelopmentEnvironment: pipe(
      readFromEnvironment("AllowDevelopmentEnvironment"),
      RE.map(booleanFromString),
      RE.orElse(() => RE.right(false)),
    ),
    androidBundleIdentifier: pipe(
      readFromEnvironment("AndroidBundleIdentifier"),
      RE.orElse(() => RE.right("it.pagopa.io.app")),
    ),
    androidCrlUrl: pipe(
      readFromEnvironment("AndroidCrlUrl"),
      RE.orElse(() => RE.right(ANDROID_CRL_URL)),
    ),
    androidPlayIntegrityUrl: pipe(
      readFromEnvironment("AndroidPlayIntegrityUrl"),
      RE.orElse(() => RE.right(ANDROID_PLAY_INTEGRITY_URL)),
    ),
    androidPlayStoreCertificateHash: readFromEnvironment(
      "AndroidPlayStoreCertificateHash",
    ),
    appleRootCertificate: pipe(
      readFromEnvironment("AppleRootCertificate"),
      RE.orElse(() => RE.right(APPLE_APP_ATTESTATION_ROOT_CA)),
      RE.map((rootCa) => rootCa.replace(/\\n/g, "\n")),
    ),
    googleAppCredentialsEncoded: readFromEnvironment(
      "GoogleAppCredentialsEncoded",
    ),
    googlePublicKey: pipe(
      readFromEnvironment("GooglePublicKey"),
      RE.orElse(() => RE.right(GOOGLE_PUBLIC_KEY)),
      RE.map((publicKey) => publicKey.replace(/\\n/g, "\n")),
    ),
    iOsBundleIdentifier: pipe(
      readFromEnvironment("IosBundleIdentifier"),
      RE.orElse(() => RE.right("it.pagopa.app.io")),
    ),
    iOsTeamIdentifier: pipe(
      readFromEnvironment("IosTeamIdentifier"),
      RE.orElse(() => RE.right("DSEVY6MV9G")),
    ),
    skipSignatureValidation: pipe(
      readFromEnvironment("SkipSignatureValidation"),
      RE.map(booleanFromString),
      RE.orElse(() => RE.right(false)),
    ),
  }),
);

export const getAzureConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureConfiguration
> = pipe(
  sequenceS(RE.Apply)({
    cosmosDbDatabaseName: readFromEnvironment("CosmosDbDatabaseName"),
    cosmosDbEndpoint: readFromEnvironment("CosmosDbEndpoint"),
    entityConfigurationStorageContainerName: readFromEnvironment(
      "EntityConfigurationStorageContainerName",
    ),
  }),
  RE.map(
    ({
      cosmosDbDatabaseName,
      cosmosDbEndpoint,
      entityConfigurationStorageContainerName,
    }) => ({
      cosmos: {
        dbName: cosmosDbDatabaseName,
        endpoint: cosmosDbEndpoint,
      },
      storage: {
        entityConfiguration: {
          containerName: entityConfigurationStorageContainerName,
        },
      },
    }),
  ),
);

const getPdvTokenizerConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  PdvTokenizerApiClientConfig
> = pipe(
  sequenceS(RE.Apply)({
    pdvTokenizerApiBaseURL: readFromEnvironment("PdvTokenizerApiBaseURL"),
    pdvTokenizerApiKey: readFromEnvironment("PdvTokenizerApiKey"),
    pdvTokenizerTestUUID: readFromEnvironment("PdvTokenizerTestUUID"),
  }),
  RE.map(
    ({ pdvTokenizerApiBaseURL, pdvTokenizerApiKey, pdvTokenizerTestUUID }) => ({
      apiKey: pdvTokenizerApiKey,
      baseURL: pdvTokenizerApiBaseURL,
      testUUID: pdvTokenizerTestUUID,
    }),
  ),
);

const getHubSpidLoginConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  HubSpidLoginConfig
> = pipe(
  sequenceS(RE.Apply)({
    hubSpidLoginClientBaseUrl: readFromEnvironment("HubSpidLoginClientBaseUrl"),
    hubSpidLoginJwtIssuer: readFromEnvironment("HubSpidLoginJwtIssuer"),
    hubSpidLoginJwtPubKey: pipe(
      readFromEnvironment("HubSpidLoginJwtPubKey"),
      RE.map((publicKey) => publicKey.replace(/\\n/g, "\n")),
    ),
  }),
  RE.map(
    ({
      hubSpidLoginClientBaseUrl,
      hubSpidLoginJwtIssuer,
      hubSpidLoginJwtPubKey,
    }) => ({
      clientBaseUrl: hubSpidLoginClientBaseUrl,
      jwtIssuer: hubSpidLoginJwtIssuer,
      jwtPubKey: hubSpidLoginJwtPubKey,
    }),
  ),
  RE.chainW((result) =>
    pipe(
      HubSpidLoginConfig.decode(result),
      RE.fromEither,
      RE.mapLeft((errs) => Error(readableReportSimplified(errs))),
    ),
  ),
);

const getTrialSystemConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  TrialSystemApiClientConfig
> = pipe(
  sequenceS(RE.Apply)({
    trialSystemApiBaseURL: readFromEnvironment("TrialSystemApiBaseURL"),
    trialSystemApiKey: readFromEnvironment("TrialSystemApiKey"),
    trialSystemFeatureFlag: readFromEnvironment("TrialSystemFeatureFlag"),
    trialSystemTrialId: readFromEnvironment("TrialSystemTrialId"),
  }),
  RE.map(
    ({
      trialSystemApiBaseURL,
      trialSystemApiKey,
      trialSystemFeatureFlag,
      trialSystemTrialId,
    }) => ({
      apiKey: trialSystemApiKey,
      baseURL: trialSystemApiBaseURL,
      featureFlag: trialSystemFeatureFlag,
      trialId: trialSystemTrialId,
    }),
  ),
);
