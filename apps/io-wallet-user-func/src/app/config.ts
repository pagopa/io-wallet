import { parse } from "@pagopa/handler-kit";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { readableReportSimplified } from "@pagopa/ts-commons/lib/reporters";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RE from "fp-ts/lib/ReaderEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import {
  AzureCosmosConfig,
  getAzureCosmosConfigFromEnvironment,
} from "io-wallet-common/infra/azure/cosmos/config";
import {
  readFromEnvironment,
  stringToNumberDecoderRE,
} from "io-wallet-common/infra/env";
import { getHttpRequestConfigFromEnvironment } from "io-wallet-common/infra/http/config";
import {
  PdvTokenizerApiClientConfig,
  getPdvTokenizerConfigFromEnvironment,
} from "io-wallet-common/infra/pdv-tokenizer/config";
import { Jwk, fromBase64ToJwks } from "io-wallet-common/jwk";

import { FederationEntityMetadata } from "../entity-configuration";

const booleanFromString = (input: string) =>
  input === "true" || input === "1" || input === "yes";

export const APPLE_APP_ATTESTATION_ROOT_CA =
  "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNJVENDQWFlZ0F3SUJBZ0lRQy9PK0R2SE4wdUQ3akc1eUgySVhtREFLQmdncWhrak9QUVFEQXpCU01TWXdKQVlEVlFRRERCMUJjSEJzWlNCQmNIQWdRWFIwWlhOMFlYUnBiMjRnVW05dmRDQkRRVEVUTUJFR0ExVUVDZ3dLUVhCd2JHVWdTVzVqTGpFVE1CRUdBMVVFQ0F3S1EyRnNhV1p2Y201cFlUQWVGdzB5TURBek1UZ3hPRE15TlROYUZ3MDBOVEF6TVRVd01EQXdNREJhTUZJeEpqQWtCZ05WQkFNTUhVRndjR3hsSUVGd2NDQkJkSFJsYzNSaGRHbHZiaUJTYjI5MElFTkJNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVJNd0VRWURWUVFJREFwRFlXeHBabTl5Ym1saE1IWXdFQVlIS29aSXpqMENBUVlGSzRFRUFDSURZZ0FFUlRIaG1MVzA3QVRhRlFJRVZ3VHRUNGR5Y3RkaE5iSmhGcy9JaTJGZENnQUhHYnBwaFkzK2Q4cWp1RG5nSU4zV1ZoUVVCSEFvTWVRL2NMaVAxc09VdGdqcUs5YXVZZW4xbU1FdlJxOVNrM0ptNVg4VTYySCt4VEQzRkU5VGdTNDFvMEl3UURBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTc2tSQlRNNzIrYUVIL3B3eXA1ZnJxNWVXS29UQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0NnWUlLb1pJemowRUF3TURhQUF3WlFJd1FnRkduQnl2c2lWYnBUS3dTZ2Ewa1AwZThFZURTNCtzUW1UdmI3dm41M081K0ZSWGdlTGhwSjA2eXNDNVByT3lBakVBcDVVNHhEZ0VnbGxGN0VuM1ZjRTNpZXhaWnRLZVlucHF0aWpWb3lGcmFXVkl5ZC9kZ2FubXJkdUMxYm1UQkd3RAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t";

export const GOOGLE_PUBLIC_KEY =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQ0lqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUFyN2JIZ2l1eHB3SHNLN1F1aTh4VQpGbU9yNzVndk1zZC9kVEVEREpkU1N4dGY2QW43eHlxcFJSOTBQTDJhYnhNMWRFcWxYbmYydHF3MU5lNFh3bDVqCmxSZmRuSkxtTjBwVHkvNGxqNC83dHYwU2szaWlLa3lwbkVVdFI2V2ZNZ0gwUVpmS0hNMStkaSt5OVRGUnR2NnkKLy8wcmIrVCtXOGE5bnNOTC9nZ2puYXI4NjQ2MXFPMHJPczJjWGpwM2tPRzFGRUo1TVZtRm1CR3RucktwYTczWApwWHlUcVJ4Qi9NMG4xbi9XOW5HcUM0RlNZYTA0VDZONVJJWkdCTjJ6Mk1UNUlLR2JGbGJDOFVyVzBEeFc3QVlJCm1RUWNIdEdsL20wMFFMVld1dEhRb1ZKWW5GUGxYVGNIWXZBU0x1K1JoaHNiRG14TWdKSjBtY0RwdnNDNFBqdkIKK1R4eXdFbGdTNzB2RTBYbUxEK09KdHZzQnNsSFp2UEJLQ09kVDBNUyt0Z1NPSWZnYSt6MVoxZzcrRFZhZ2Y3cQp1dm1hZzhqZlBpb3lLdnhuSy9FZ3NUVVZpMmdoenE4d20yN3VkL21JTTdBWTJxRU9SUjhHbzNUVkI0SHpXUWdwClpydDNpNU1JbENhWTUwNEx6U1JpaWdIQ3pBUGxId3MrVzByQjVOK2VyNS8ycEpLbmZCU0RpQ2lGQVZ0Q0xPWjcKZ0xpTW0wamhPMkI2dFVYSEkvK01SUGp5MDJpNTlsSU5NUlJldjU2R0t0Y2Q5cU8vMGtVSldkWlRkQTJYb1M4MgppeFB2WnRYUXBVcHVMMTJhYis5RWFESzhaNFJISllZZkNUM1E1dk5BWGFpV1ErOFBUV20yUWdCUi9ia3dTV2MrCk5wVUZnTlBOOVB2UWk4V0VnNVVtQUdNQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==";

export const decodeBase64String = (encodedString: string) =>
  Buffer.from(encodedString, "base64").toString();

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
  androidBundleIdentifiers: t.array(t.string),
  androidCrlUrl: t.string,
  androidPlayIntegrityUrl: t.string,
  androidPlayStoreCertificateHash: t.string,
  appleRootCertificate: t.string,
  googleAppCredentialsEncoded: t.string,
  googlePublicKey: t.string,
  httpRequestTimeout: NumberFromString,
  iOsTeamIdentifier: t.string,
  iosBundleIdentifiers: t.array(t.string),
  skipChainValidation: t.boolean,
  skipSignatureValidation: t.boolean,
});

export type AttestationServiceConfiguration = t.TypeOf<
  typeof AttestationServiceConfiguration
>;

const AzureConfig = t.type({
  cosmos: AzureCosmosConfig,
  storage: t.type({
    entityConfiguration: t.type({ containerName: t.string }),
  }),
});

type AzureConfig = t.TypeOf<typeof AzureConfig>;

const JwtValidatorConfig = t.type({
  exchange: t.type({
    jwtIssuer: NonEmptyString,
    jwtPubKey: NonEmptyString,
  }),
  hubSpidLogin: t.type({
    clientBaseUrl: NonEmptyString,
    jwtIssuer: NonEmptyString,
    jwtPubKey: NonEmptyString,
  }),
});

export type JwtValidatorConfig = t.TypeOf<typeof JwtValidatorConfig>;

const TrialSystemApiClientConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  featureFlag: t.string,
  requestTimeout: NumberFromString,
  trialId: t.string,
});

export type TrialSystemApiClientConfig = t.TypeOf<
  typeof TrialSystemApiClientConfig
>;

const PidIssuerApiClientConfig = t.type({
  baseURL: t.string,
  clientCertificate: t.string,
  clientPrivateKey: t.string,
  healthCheckEnabled: t.boolean,
  requestTimeout: NumberFromString,
  rootCACertificate: t.string,
});

export type PidIssuerApiClientConfig = t.TypeOf<
  typeof PidIssuerApiClientConfig
>;

const LoadTestConfig = t.type({
  testUsersFiscalCode: t.array(FiscalCode),
});

export type LoadTestConfig = t.TypeOf<typeof LoadTestConfig>;

export const Config = t.type({
  attestationService: AttestationServiceConfiguration,
  azure: AzureConfig,
  crypto: CryptoConfiguration,
  federationEntity: FederationEntityMetadata,
  jwtValidator: JwtValidatorConfig,
  loadTest: LoadTestConfig,
  pdvTokenizer: PdvTokenizerApiClientConfig,
  pidIssuer: PidIssuerApiClientConfig,
  trialSystem: TrialSystemApiClientConfig,
});

export type Config = t.TypeOf<typeof Config>;

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
  Omit<AttestationServiceConfiguration, "httpRequestTimeout">
> = pipe(
  sequenceS(RE.Apply)({
    allowDevelopmentEnvironment: pipe(
      readFromEnvironment("AllowDevelopmentEnvironment"),
      RE.map(booleanFromString),
      RE.orElse(() => RE.right(false)),
    ),
    androidBundleIdentifiers: pipe(
      readFromEnvironment("AndroidBundleIdentifiers"),
      RE.map((identifiers) => identifiers.split(",")),
      RE.orElse(() => RE.right(["it.pagopa.io.app"])),
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
      RE.map(decodeBase64String),
    ),
    googleAppCredentialsEncoded: readFromEnvironment(
      "GoogleAppCredentialsEncoded",
    ),
    googlePublicKey: pipe(
      readFromEnvironment("GooglePublicKey"),
      RE.orElse(() => RE.right(GOOGLE_PUBLIC_KEY)),
      RE.map(decodeBase64String),
    ),
    iOsTeamIdentifier: pipe(
      readFromEnvironment("IosTeamIdentifier"),
      RE.orElse(() => RE.right("DSEVY6MV9G")),
    ),
    iosBundleIdentifiers: pipe(
      readFromEnvironment("IosBundleIdentifiers"),
      RE.map((identifiers) => identifiers.split(",")),
      RE.orElse(() => RE.right(["it.pagopa.app.io"])),
    ),
    skipChainValidation: pipe(
      readFromEnvironment("SkipChainValidation"),
      RE.map(booleanFromString),
      RE.orElse(() => RE.right(false)),
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
  AzureConfig
> = pipe(
  sequenceS(RE.Apply)({
    cosmos: getAzureCosmosConfigFromEnvironment,
    entityConfigurationStorageContainerName: readFromEnvironment(
      "EntityConfigurationStorageContainerName",
    ),
  }),
  RE.map(({ cosmos, entityConfigurationStorageContainerName }) => ({
    cosmos,
    storage: {
      entityConfiguration: {
        containerName: entityConfigurationStorageContainerName,
      },
    },
  })),
);

const getJwtValidatorConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  JwtValidatorConfig
> = pipe(
  sequenceS(RE.Apply)({
    exchangeJwtIssuer: readFromEnvironment("ExchangeJwtIssuer"),
    exchangeJwtPubKey: pipe(
      readFromEnvironment("ExchangeJwtPubKey"),
      RE.map(decodeBase64String),
    ),
    hubSpidLoginClientBaseUrl: readFromEnvironment("HubSpidLoginClientBaseUrl"),
    hubSpidLoginJwtIssuer: readFromEnvironment("HubSpidLoginJwtIssuer"),
    hubSpidLoginJwtPubKey: pipe(
      readFromEnvironment("HubSpidLoginJwtPubKey"),
      RE.map(decodeBase64String),
    ),
  }),
  RE.map(
    ({
      exchangeJwtIssuer,
      exchangeJwtPubKey,
      hubSpidLoginClientBaseUrl,
      hubSpidLoginJwtIssuer,
      hubSpidLoginJwtPubKey,
    }) => ({
      exchange: {
        jwtIssuer: exchangeJwtIssuer,
        jwtPubKey: exchangeJwtPubKey,
      },
      hubSpidLogin: {
        clientBaseUrl: hubSpidLoginClientBaseUrl,
        jwtIssuer: hubSpidLoginJwtIssuer,
        jwtPubKey: hubSpidLoginJwtPubKey,
      },
    }),
  ),
  RE.chainW(
    flow(
      JwtValidatorConfig.decode,
      RE.fromEither,
      RE.mapLeft((errs) => Error(readableReportSimplified(errs))),
    ),
  ),
);

const getTrialSystemConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Omit<TrialSystemApiClientConfig, "requestTimeout">
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

const getLoadTestConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  LoadTestConfig
> = pipe(
  sequenceS(RE.Apply)({
    testUsersFiscalCode: pipe(
      readFromEnvironment("TestUsersFiscalCodeForLoadTest"),
      RE.map((testUsers) => testUsers.split(",")),
      RE.chainW(
        flow(
          t.array(FiscalCode).decode,
          RE.fromEither,
          RE.mapLeft((errs) => Error(readableReportSimplified(errs))),
        ),
      ),
    ),
  }),
  RE.map(({ testUsersFiscalCode }) => ({
    testUsersFiscalCode,
  })),
);

const getPidIssuerConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  PidIssuerApiClientConfig
> = pipe(
  sequenceS(RE.Apply)({
    pidIssuerApiBaseURL: readFromEnvironment("PidIssuerApiBaseURL"),
    pidIssuerApiClientCertificate: pipe(
      readFromEnvironment("PidIssuerApiClientCertificate"),
      RE.map(decodeBase64String),
    ),
    pidIssuerApiClientPrivateKey: pipe(
      readFromEnvironment("PidIssuerApiClientPrivateKey"),
      RE.map(decodeBase64String),
    ),
    pidIssuerApiRequestTimeout: pipe(
      readFromEnvironment("PidIssuerApiRequestTimeout"),
      RE.chainW(stringToNumberDecoderRE),
    ),
    pidIssuerApiRootCACertificate: pipe(
      readFromEnvironment("PidIssuerApiRootCACertificate"),
      RE.map(decodeBase64String),
    ),
    pidIssuerHealthCheckEnabled: pipe(
      readFromEnvironment("PidIssuerHealthCheckEnabled"),
      RE.map(booleanFromString),
      RE.orElse(() => RE.right(false)),
    ),
  }),
  RE.map(
    ({
      pidIssuerApiBaseURL,
      pidIssuerApiClientCertificate,
      pidIssuerApiClientPrivateKey,
      pidIssuerApiRequestTimeout,
      pidIssuerApiRootCACertificate,
      pidIssuerHealthCheckEnabled,
    }) => ({
      baseURL: pidIssuerApiBaseURL,
      clientCertificate: pidIssuerApiClientCertificate,
      clientPrivateKey: pidIssuerApiClientPrivateKey,
      healthCheckEnabled: pidIssuerHealthCheckEnabled,
      requestTimeout: pidIssuerApiRequestTimeout,
      rootCACertificate: pidIssuerApiRootCACertificate,
    }),
  ),
);

export const getConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Config
> = pipe(
  sequenceS(RE.Apply)({
    attestationService: getAttestationServiceConfigFromEnvironment,
    azure: getAzureConfigFromEnvironment,
    crypto: getCryptoConfigFromEnvironment,
    federationEntity: getFederationEntityConfigFromEnvironment,
    httpRequestTimeout: pipe(
      getHttpRequestConfigFromEnvironment,
      RE.map(({ timeout }) => timeout),
    ),
    jwtValidator: getJwtValidatorConfigFromEnvironment,
    loadTest: getLoadTestConfigFromEnvironment,
    pdvTokenizer: getPdvTokenizerConfigFromEnvironment,
    pidIssuer: getPidIssuerConfigFromEnvironment,
    trialSystem: getTrialSystemConfigFromEnvironment,
  }),
  RE.map(
    ({
      attestationService,
      httpRequestTimeout,
      pdvTokenizer,
      trialSystem,
      ...remainingConfigs
    }) => ({
      ...remainingConfigs,
      attestationService: {
        ...attestationService,
        httpRequestTimeout,
      },
      pdvTokenizer: {
        ...pdvTokenizer,
        requestTimeout: httpRequestTimeout,
      },
      trialSystem: {
        ...trialSystem,
        requestTimeout: httpRequestTimeout,
      },
    }),
  ),
);
