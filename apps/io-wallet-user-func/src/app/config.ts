import { parse } from "@pagopa/handler-kit";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as A from "fp-ts/Array";
import { sequenceS } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/function";
import * as RE from "fp-ts/lib/ReaderEither";
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
  getSlackConfigFromEnvironment,
  SlackConfig,
} from "io-wallet-common/infra/slack/config";
import { fromBase64ToJwks, JwkPrivateKey } from "io-wallet-common/jwk";

const booleanFromString = (input: string) =>
  input === "true" || input === "1" || input === "yes";

export const APPLE_APP_ATTESTATION_ROOT_CA =
  "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNJVENDQWFlZ0F3SUJBZ0lRQy9PK0R2SE4wdUQ3akc1eUgySVhtREFLQmdncWhrak9QUVFEQXpCU01TWXdKQVlEVlFRRERCMUJjSEJzWlNCQmNIQWdRWFIwWlhOMFlYUnBiMjRnVW05dmRDQkRRVEVUTUJFR0ExVUVDZ3dLUVhCd2JHVWdTVzVqTGpFVE1CRUdBMVVFQ0F3S1EyRnNhV1p2Y201cFlUQWVGdzB5TURBek1UZ3hPRE15TlROYUZ3MDBOVEF6TVRVd01EQXdNREJhTUZJeEpqQWtCZ05WQkFNTUhVRndjR3hsSUVGd2NDQkJkSFJsYzNSaGRHbHZiaUJTYjI5MElFTkJNUk13RVFZRFZRUUtEQXBCY0hCc1pTQkpibU11TVJNd0VRWURWUVFJREFwRFlXeHBabTl5Ym1saE1IWXdFQVlIS29aSXpqMENBUVlGSzRFRUFDSURZZ0FFUlRIaG1MVzA3QVRhRlFJRVZ3VHRUNGR5Y3RkaE5iSmhGcy9JaTJGZENnQUhHYnBwaFkzK2Q4cWp1RG5nSU4zV1ZoUVVCSEFvTWVRL2NMaVAxc09VdGdqcUs5YXVZZW4xbU1FdlJxOVNrM0ptNVg4VTYySCt4VEQzRkU5VGdTNDFvMEl3UURBUEJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTc2tSQlRNNzIrYUVIL3B3eXA1ZnJxNWVXS29UQU9CZ05WSFE4QkFmOEVCQU1DQVFZd0NnWUlLb1pJemowRUF3TURhQUF3WlFJd1FnRkduQnl2c2lWYnBUS3dTZ2Ewa1AwZThFZURTNCtzUW1UdmI3dm41M081K0ZSWGdlTGhwSjA2eXNDNVByT3lBakVBcDVVNHhEZ0VnbGxGN0VuM1ZjRTNpZXhaWnRLZVlucHF0aWpWb3lGcmFXVkl5ZC9kZ2FubXJkdUMxYm1UQkd3RAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t";

export const GOOGLE_PUBLIC_KEY =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQ0lqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FnOEFNSUlDQ2dLQ0FnRUFyN2JIZ2l1eHB3SHNLN1F1aTh4VQpGbU9yNzVndk1zZC9kVEVEREpkU1N4dGY2QW43eHlxcFJSOTBQTDJhYnhNMWRFcWxYbmYydHF3MU5lNFh3bDVqCmxSZmRuSkxtTjBwVHkvNGxqNC83dHYwU2szaWlLa3lwbkVVdFI2V2ZNZ0gwUVpmS0hNMStkaSt5OVRGUnR2NnkKLy8wcmIrVCtXOGE5bnNOTC9nZ2puYXI4NjQ2MXFPMHJPczJjWGpwM2tPRzFGRUo1TVZtRm1CR3RucktwYTczWApwWHlUcVJ4Qi9NMG4xbi9XOW5HcUM0RlNZYTA0VDZONVJJWkdCTjJ6Mk1UNUlLR2JGbGJDOFVyVzBEeFc3QVlJCm1RUWNIdEdsL20wMFFMVld1dEhRb1ZKWW5GUGxYVGNIWXZBU0x1K1JoaHNiRG14TWdKSjBtY0RwdnNDNFBqdkIKK1R4eXdFbGdTNzB2RTBYbUxEK09KdHZzQnNsSFp2UEJLQ09kVDBNUyt0Z1NPSWZnYSt6MVoxZzcrRFZhZ2Y3cQp1dm1hZzhqZlBpb3lLdnhuSy9FZ3NUVVZpMmdoenE4d20yN3VkL21JTTdBWTJxRU9SUjhHbzNUVkI0SHpXUWdwClpydDNpNU1JbENhWTUwNEx6U1JpaWdIQ3pBUGxId3MrVzByQjVOK2VyNS8ycEpLbmZCU0RpQ2lGQVZ0Q0xPWjcKZ0xpTW0wamhPMkI2dFVYSEkvK01SUGp5MDJpNTlsSU5NUlJldjU2R0t0Y2Q5cU8vMGtVSldkWlRkQTJYb1M4MgppeFB2WnRYUXBVcHVMMTJhYis5RWFESzhaNFJISllZZkNUM1E1dk5BWGFpV1ErOFBUV20yUWdCUi9ia3dTV2MrCk5wVUZnTlBOOVB2UWk4V0VnNVVtQUdNQ0F3RUFBUT09Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==,LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUhZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUNJRFlnQUVJOW9qY1U3ZlBsc0ZDanh5NklScXpnZU9vSzBiK1lzVgo5RlBReXdpeXc4RVFSVGtKOXUzcXdmbkk0REdvU0xsQnFDbFRYSmZnZkNjWnZzNjBGaWtOTUhudTRma1J6T2JmCmdEa1UyS05YZXpUOS9SUStYdk5zbHhQSHJIQ293aEdyCi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==";

export const HARDWARE_PUBLIC_TEST_KEY =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFMDFtMHhmNXVqUTVnMjJGdloyemJGcnZ5THg5YgpnTjJBaUxWRnRjYTJCVUh0a2dwV3Y5WUpDRElzNmxQS3hWU3NFb25QVXZPTTJVcmNNUGdwMDRZZU9nPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t";

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

export const MailConfig = t.type({
  mailSender: NonEmptyString,
  mailupSecret: NonEmptyString,
  mailupUsername: NonEmptyString,
});

export type MailConfig = t.TypeOf<typeof MailConfig>;

export const getMailConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  MailConfig
> = pipe(
  sequenceS(RE.Apply)({
    mailSender: pipe(
      readFromEnvironment("MailSender"),
      RE.chainEitherKW(parse(NonEmptyString, "Invalid mail sender")),
    ),
    mailupSecret: pipe(
      readFromEnvironment("MailupSecret"),
      RE.chainEitherKW(parse(NonEmptyString, "Invalid mailup secret")),
    ),
    mailupUsername: pipe(
      readFromEnvironment("MailupUsername"),
      RE.chainEitherKW(parse(NonEmptyString, "Invalid mailup username")),
    ),
  }),
);

export const CryptoConfiguration = t.type({
  jwks: t.array(JwkPrivateKey),
  jwtDefaultAlg: t.string,
  jwtDefaultDuration: t.string,
});

export type CryptoConfiguration = t.TypeOf<typeof CryptoConfiguration>;

export const AttestationServiceConfiguration = t.type({
  allowedDeveloperUsers: t.array(t.string),
  androidBundleIdentifiers: t.array(t.string),
  androidCrlUrl: t.string,
  androidPlayIntegrityUrl: t.string,
  androidPlayStoreCertificateHash: t.string,
  appleRootCertificate: t.string,
  googleAppCredentialsEncoded: t.string,
  googlePublicKeys: t.array(t.string),
  hardwarePublicTestKey: t.string,
  httpRequestTimeout: NumberFromString,
  iosBundleIdentifiers: t.array(t.string),
  iOsTeamIdentifier: t.string,
  skipSignatureValidation: t.boolean,
});

export type AttestationServiceConfiguration = t.TypeOf<
  typeof AttestationServiceConfiguration
>;

const AzureStorageConfig = t.type({
  entityConfiguration: t.type({
    accountName: t.string,
    containerName: t.string,
  }),
  walletInstances: t.type({
    queues: t.type({
      creationSendEmail: t.type({
        name: t.string,
      }),
      revocationSendEmail: t.type({
        name: t.string,
      }),
    }),
    url: t.string,
  }),
});

type AzureStorageConfig = t.TypeOf<typeof AzureStorageConfig>;

const AzureGenericConfig = t.type({
  resourceGroupName: NonEmptyString,
  subscriptionId: NonEmptyString,
});

type AzureGenericConfig = t.TypeOf<typeof AzureGenericConfig>;

const AzureFrontDoorConfig = t.type({
  endpointName: NonEmptyString,
  profileName: NonEmptyString,
});

type AzureFrontDoorConfig = t.TypeOf<typeof AzureFrontDoorConfig>;

const AzureConfig = t.type({
  cosmos: AzureCosmosConfig,
  frontDoor: AzureFrontDoorConfig,
  generic: AzureGenericConfig,
  storage: AzureStorageConfig,
});

type AzureConfig = t.TypeOf<typeof AzureConfig>;

const AuthProfileApiConfig = t.type({
  apiKey: t.string,
  baseURL: t.string,
  httpRequestTimeout: NumberFromString,
});

export type AuthProfileApiConfig = t.TypeOf<typeof AuthProfileApiConfig>;

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

const FederationEntityConfig = t.type({
  basePath: UrlFromString,
  contacts: t.array(EmailString),
  homepageUri: UrlFromString,
  jwtSigningConfig: CryptoConfiguration,
  logoUri: UrlFromString,
  organizationName: NonEmptyString,
  policyUri: UrlFromString,
  tosUri: UrlFromString,
});

type FederationEntityConfig = t.TypeOf<typeof FederationEntityConfig>;

const EntityConfigurationConfig = t.type({
  federationEntity: FederationEntityConfig,
  trustAnchorUrl: UrlFromString,
});

export type EntityConfigurationConfig = t.TypeOf<
  typeof EntityConfigurationConfig
>;

const WalletProviderConfig = t.type({
  certificate: t.type({
    country: t.string,
    locality: t.string,
    state: t.string,
  }),
  jwtSigningConfig: CryptoConfiguration,
  walletAttestation: t.type({
    walletLink: t.string,
    walletName: t.string,
  }),
});

type WalletProviderConfig = t.TypeOf<typeof WalletProviderConfig>;

export const Config = t.type({
  attestationService: AttestationServiceConfiguration,
  authProfile: AuthProfileApiConfig,
  azure: AzureConfig,
  entityConfiguration: EntityConfigurationConfig,
  mail: MailConfig,
  pidIssuer: PidIssuerApiClientConfig,
  slack: SlackConfig,
  walletProvider: WalletProviderConfig,
});

export type Config = t.TypeOf<typeof Config>;

const getEntityConfigurationFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  EntityConfigurationConfig
> = pipe(
  sequenceS(RE.Apply)({
    basePath: readFromEnvironment("FederationEntityBasePath"),
    contacts: pipe(
      readFromEnvironment("FederationEntityContacts"),
      RE.map((urls) => urls.split(",")),
    ),
    homepageUri: readFromEnvironment("FederationEntityHomepageUri"),
    jwks: pipe(
      readFromEnvironment("FederationEntitySigningKeys"),
      RE.chainEitherKW(fromBase64ToJwks),
    ),
    jwtDefaultAlg: pipe(
      readFromEnvironment("EntityConfigurationJwtDefaultAlg"),
      RE.orElse(() => RE.right("ES256")),
    ),
    jwtDefaultDuration: pipe(
      readFromEnvironment("EntityConfigurationJwtDefaultDuration"),
      RE.orElse(() => RE.right("24h")),
    ),
    logoUri: readFromEnvironment("FederationEntityLogoUri"),
    organizationName: readFromEnvironment("FederationEntityOrganizationName"),
    policyUri: readFromEnvironment("FederationEntityPolicyUri"),
    tosUri: readFromEnvironment("FederationEntityTosUri"),
    trustAnchorUrl: pipe(
      readFromEnvironment("TrustAnchorUrl"),
      RE.chainEitherKW(parse(UrlFromString)),
    ),
  }),
  RE.map(
    ({
      jwks,
      jwtDefaultAlg,
      jwtDefaultDuration,
      trustAnchorUrl,
      ...federationEntity
    }) => ({
      federationEntity: {
        ...federationEntity,
        jwtSigningConfig: {
          jwks,
          jwtDefaultAlg,
          jwtDefaultDuration,
        },
      },
      trustAnchorUrl,
    }),
  ),
  RE.chainEitherKW(
    parse(EntityConfigurationConfig, "Entity configuration config is invalid"),
  ),
);

const getAttestationServiceConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Omit<AttestationServiceConfiguration, "httpRequestTimeout">
> = pipe(
  sequenceS(RE.Apply)({
    allowedDeveloperUsers: pipe(
      readFromEnvironment("AllowedDeveloperUsers"),
      RE.map((identifiers) => identifiers.split(",")),
      RE.orElse(
        (): RE.ReaderEither<NodeJS.ProcessEnv, Error, string[]> => RE.right([]),
      ),
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
    googlePublicKeys: pipe(
      readFromEnvironment("GooglePublicKeys"),
      RE.map((keys) => keys.split(",")),
      RE.orElse(() => RE.right(GOOGLE_PUBLIC_KEY.split(","))),
      RE.map(A.map(decodeBase64String)),
    ),
    hardwarePublicTestKey: pipe(
      readFromEnvironment("HardwarePublicTestKey"),
      RE.orElse(() => RE.right(HARDWARE_PUBLIC_TEST_KEY)),
      RE.map(decodeBase64String),
    ),
    iosBundleIdentifiers: pipe(
      readFromEnvironment("IosBundleIdentifiers"),
      RE.map((identifiers) => identifiers.split(",")),
      RE.orElse(() => RE.right(["it.pagopa.app.io"])),
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

const getAzureStorageConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureStorageConfig
> = pipe(
  sequenceS(RE.Apply)({
    entityConfigurationStorageAccountName: readFromEnvironment(
      "EntityConfigurationStorageAccountName",
    ),
    entityConfigurationStorageContainerName: readFromEnvironment(
      "EntityConfigurationStorageContainerName",
    ),
    walletInstanceCreationEmailQueueName: readFromEnvironment(
      "WalletInstanceCreationEmailQueueName",
    ),
    walletInstanceRevocationEmailQueueName: readFromEnvironment(
      "WalletInstanceRevocationEmailQueueName",
    ),
    walletInstanceStorageAccountUrl: readFromEnvironment(
      "WalletInstanceStorageAccountUrl",
    ),
  }),
  RE.map(
    ({
      entityConfigurationStorageAccountName,
      entityConfigurationStorageContainerName,
      walletInstanceCreationEmailQueueName,
      walletInstanceRevocationEmailQueueName,
      walletInstanceStorageAccountUrl,
    }) => ({
      entityConfiguration: {
        accountName: entityConfigurationStorageAccountName,
        containerName: entityConfigurationStorageContainerName,
      },
      walletInstances: {
        queues: {
          creationSendEmail: {
            name: walletInstanceCreationEmailQueueName,
          },
          revocationSendEmail: {
            name: walletInstanceRevocationEmailQueueName,
          },
        },
        url: walletInstanceStorageAccountUrl,
      },
    }),
  ),
);

const getAzureFrontDoorConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureFrontDoorConfig
> = pipe(
  sequenceS(RE.Apply)({
    endpointName: readFromEnvironment("FrontDoorEndpointName"),
    profileName: readFromEnvironment("FrontDoorProfileName"),
  }),
  RE.chainEitherKW(parse(AzureFrontDoorConfig)),
);

const getAzureGenericConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureGenericConfig
> = pipe(
  sequenceS(RE.Apply)({
    resourceGroupName: readFromEnvironment("AzureResourceGroupName"),
    subscriptionId: readFromEnvironment("AzureSubscriptionId"),
  }),
  RE.chainEitherKW(parse(AzureGenericConfig)),
);

export const getAzureConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  AzureConfig
> = sequenceS(RE.Apply)({
  cosmos: getAzureCosmosConfigFromEnvironment,
  frontDoor: getAzureFrontDoorConfigFromEnvironment,
  generic: getAzureGenericConfigFromEnvironment,
  storage: getAzureStorageConfigFromEnvironment,
});

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

const getAuthProfileApiConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  Omit<AuthProfileApiConfig, "httpRequestTimeout">
> = sequenceS(RE.Apply)({
  apiKey: readFromEnvironment("AuthProfileApiKey"),
  baseURL: readFromEnvironment("AuthProfileApiBaseURL"),
});

const getWalletProviderConfigFromEnvironment: RE.ReaderEither<
  NodeJS.ProcessEnv,
  Error,
  WalletProviderConfig
> = pipe(
  sequenceS(RE.Apply)({
    certificateCountry: readFromEnvironment("WalletProviderCertificateCountry"),
    certificateLocality: readFromEnvironment(
      "WalletProviderCertificateLocality",
    ),
    certificateState: readFromEnvironment("WalletProviderCertificateState"),
    jwks: pipe(
      readFromEnvironment("WalletProviderSigningKeys"),
      RE.chainEitherKW(fromBase64ToJwks),
      RE.chainEitherKW(parse(t.array(JwkPrivateKey))),
    ),
    jwtDefaultAlg: pipe(
      readFromEnvironment("WalletAttestationJwtDefaultAlg"),
      RE.orElse(() => RE.right("ES256")),
    ),
    jwtDefaultDuration: pipe(
      readFromEnvironment("WalletAttestationJwtDefaultDuration"),
      RE.orElse(() => RE.right("1h")),
    ),
    walletAttestationWalletLink: readFromEnvironment(
      "WalletAttestationWalletLink",
    ),
    walletAttestationWalletName: readFromEnvironment(
      "WalletAttestationWalletName",
    ),
  }),
  RE.map(
    ({
      certificateCountry,
      certificateLocality,
      certificateState,
      walletAttestationWalletLink,
      walletAttestationWalletName,
      ...jwtSigningConfig
    }) => ({
      certificate: {
        country: certificateCountry,
        locality: certificateLocality,
        state: certificateState,
      },
      jwtSigningConfig,
      walletAttestation: {
        walletLink: walletAttestationWalletLink,
        walletName: walletAttestationWalletName,
      },
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
    authProfile: getAuthProfileApiConfigFromEnvironment,
    azure: getAzureConfigFromEnvironment,
    entityConfiguration: getEntityConfigurationFromEnvironment,
    httpRequestTimeout: pipe(
      getHttpRequestConfigFromEnvironment,
      RE.map(({ timeout }) => timeout),
    ),
    mail: getMailConfigFromEnvironment,
    pidIssuer: getPidIssuerConfigFromEnvironment,
    slack: getSlackConfigFromEnvironment,
    walletProvider: getWalletProviderConfigFromEnvironment,
  }),
  RE.map(
    ({
      attestationService,
      authProfile,
      httpRequestTimeout,
      ...remainingConfigs
    }) => ({
      ...remainingConfigs,
      attestationService: {
        ...attestationService,
        httpRequestTimeout,
      },
      authProfile: {
        ...authProfile,
        httpRequestTimeout,
      },
    }),
  ),
);
