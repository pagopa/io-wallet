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
  AndroidBundleIdentifiers: t.array(t.string),
  IosBundleIdentifiers: t.array(t.string),
  allowDevelopmentEnvironment: t.boolean,
  androidCrlUrl: t.string,
  androidPlayIntegrityUrl: t.string,
  androidPlayStoreCertificateHash: t.string,
  appleRootCertificate: t.string,
  googleAppCredentialsEncoded: t.string,
  googlePublicKey: t.string,
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
    AndroidBundleIdentifiers: pipe(
      readFromEnvironment("AndroidBundleIdentifiers"),
      RE.map((identifiers) => identifiers.split(",")),
      RE.orElse(() => RE.right(["it.pagopa.io.app"])),
    ),
    IosBundleIdentifiers: pipe(
      readFromEnvironment("IosBundleIdentifiers"),
      RE.map((identifiers) => identifiers.split(",")),
      RE.orElse(() => RE.right(["it.pagopa.app.io"])),
    ),
    allowDevelopmentEnvironment: pipe(
      readFromEnvironment("AllowDevelopmentEnvironment"),
      RE.map(booleanFromString),
      RE.orElse(() => RE.right(false)),
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
      RE.map(decodeBase64String),
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
