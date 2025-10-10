/* eslint-disable perfectionist/sort-imports */
import ai from "@/infra/azure/appinsights/start";

import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { Crypto } from "@peculiar/webcrypto";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { SlackNotificationService } from "io-wallet-common/infra/slack/notification";

import withAppInsights from "@/infra/azure/appinsights/wrapper-handler";
import { CosmosDbCertificateRepository } from "@/infra/azure/cosmos/certificate";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { CosmosDbWhitelistedFiscalCodeRepository } from "@/infra/azure/cosmos/whitelisted-fiscal-code";
// import { AddWalletInstanceUserIdFunction } from "@/infra/azure/functions/add-wallet-instance-user-id";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletAttestationV2Function } from "@/infra/azure/functions/create-wallet-attestation-v2";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { DeleteWalletInstancesFunction } from "@/infra/azure/functions/delete-wallet-instances";
import { GenerateCertificateChainFunction } from "@/infra/azure/functions/generate-certificate-chain";
import { GenerateEntityConfigurationFunction } from "@/infra/azure/functions/generate-entity-configuration";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetWalletInstanceStatusFunction } from "@/infra/azure/functions/get-wallet-instance-status";
import { HealthFunction } from "@/infra/azure/functions/health";
import { SendEmailOnWalletInstanceCreationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-creation";
import { SendEmailOnWalletInstanceRevocationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-revocation";
import { SetWalletInstanceStatusFunction } from "@/infra/azure/functions/set-wallet-instance-status";
import { IsFiscalCodeWhitelistedFunction } from "@/infra/azure/functions/whitelisted-fiscal-code";
import { CryptoSigner } from "@/infra/crypto/signer";
import { EmailNotificationServiceClient } from "@/infra/email";
import { WalletInstanceRevocationQueueItem } from "@/infra/handlers/send-email-on-wallet-instance-revocation";
import { MobileAttestationService } from "@/infra/mobile-attestation-service";
import { PidIssuerClient } from "@/infra/pid-issuer/client";

import { getConfigFromEnvironment } from "./config";

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity),
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

const credential = new DefaultAzureCredential();

const cosmosClient = new CosmosClient({
  aadCredentials: credential,
  connectionPolicy: {
    requestTimeout: config.azure.cosmos.requestTimeout,
  },
  endpoint: config.azure.cosmos.endpoint,
});

const queueServiceClient = QueueServiceClient.fromConnectionString(
  config.azure.storage.walletInstances.connectionString,
);

const walletInstanceCreationEmailQueueClient =
  queueServiceClient.getQueueClient(
    config.azure.storage.walletInstances.queues.creationSendEmail.name,
  );

const walletInstanceRevocationEmailQueueClient =
  queueServiceClient.getQueueClient(
    config.azure.storage.walletInstances.queues.revocationSendEmail.name,
  );

const database = cosmosClient.database(config.azure.cosmos.dbName);

const nonceRepository = new CosmosDbNonceRepository(database);

const entityConfigurationSigner = new CryptoSigner(
  config.entityConfiguration.federationEntity.jwtSigningConfig,
);

const walletAttestationSigner = new CryptoSigner(
  config.walletProvider.jwtSigningConfig,
);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

const whitelistedFiscalCodeRepository =
  new CosmosDbWhitelistedFiscalCodeRepository(database);

const pidIssuerClient = new PidIssuerClient(
  config.pidIssuer,
  config.entityConfiguration.federationEntity.basePath.href,
);

const appInsightsClient = ai.defaultClient;

const mobileAttestationService = new MobileAttestationService(
  config.attestationService,
);

const slackNotificationService = new SlackNotificationService(config.slack);

const emailNotificationService = new EmailNotificationServiceClient({
  authProfileApiConfig: config.authProfile,
  mailConfig: config.mail,
});

const blobServiceClient = new BlobServiceClient(
  `https://${config.azure.storage.entityConfiguration.accountName}.blob.core.windows.net`,
  credential,
);

const containerClient = blobServiceClient.getContainerClient(
  config.azure.storage.entityConfiguration.containerName,
);

const certificateRepository = new CosmosDbCertificateRepository(database);

const certificateIssuerAndSubject = `C=${config.walletProvider.certificate.country}, ST=${config.walletProvider.certificate.state}, L=${config.walletProvider.certificate.locality}, O=${config.entityConfiguration.federationEntity.organizationName}, CN=${config.entityConfiguration.federationEntity.basePath.hostname}`;

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: withAppInsights(
    HealthFunction({
      cosmosClient,
      pidIssuerClient,
    }),
  ),
  methods: ["GET"],
  route: "health",
});

app.http("createWalletAttestation", {
  authLevel: "function",
  handler: withAppInsights(
    CreateWalletAttestationFunction({
      attestationService: mobileAttestationService,
      certificateRepository,
      entityConfiguration: {
        ...config.entityConfiguration,
        authorityHints: [config.entityConfiguration.trustAnchorUrl],
      },
      entityConfigurationSigner,
      nonceRepository,
      telemetryClient: appInsightsClient,
      walletAttestationSigner,
      walletInstanceRepository,
    }),
  ),
  methods: ["POST"],
  route: "token",
});

app.http("createWalletInstance", {
  authLevel: "function",
  handler: withAppInsights(
    CreateWalletInstanceFunction({
      attestationService: mobileAttestationService,
      nonceRepository,
      queueClient: walletInstanceCreationEmailQueueClient,
      telemetryClient: appInsightsClient,
      walletInstanceRepository,
      whitelistedFiscalCodeRepository,
    }),
  ),
  methods: ["POST"],
  route: "wallet-instances",
});

app.http("getNonce", {
  authLevel: "function",
  handler: withAppInsights(
    GetNonceFunction({
      nonceRepository,
      telemetryClient: appInsightsClient,
    }),
  ),
  methods: ["GET"],
  route: "nonce",
});

app.timer("generateEntityConfiguration", {
  handler: GenerateEntityConfigurationFunction({
    certificateRepository,
    containerClient,
    entityConfiguration: {
      ...config.entityConfiguration,
      authorityHints: [config.entityConfiguration.trustAnchorUrl],
    },
    entityConfigurationSigner,
    inputDecoder: t.unknown,
    telemetryClient: appInsightsClient,
    walletAttestationSigner,
  }),
  schedule: "0 0 */12 * * *", // the function returns a jwt that is valid for 24 hours, so the trigger is set every 12 hours
});

app.http("getWalletInstanceStatus", {
  authLevel: "function",
  handler: withAppInsights(
    GetWalletInstanceStatusFunction({
      telemetryClient: appInsightsClient,
      walletInstanceRepository,
    }),
  ),
  methods: ["GET"],
  route: "wallet-instances/{id}/status",
});

app.http("getCurrentWalletInstanceStatus", {
  authLevel: "function",
  handler: withAppInsights(
    GetCurrentWalletInstanceStatusFunction({
      walletInstanceRepository,
    }),
  ),
  methods: ["GET"],
  route: "wallet-instances/current/status",
});

app.http("setWalletInstanceStatus", {
  authLevel: "function",
  handler: withAppInsights(
    SetWalletInstanceStatusFunction({
      credentialRepository: pidIssuerClient,
      queueClient: walletInstanceRevocationEmailQueueClient,
      telemetryClient: appInsightsClient,
      walletInstanceRepository,
      whitelistedFiscalCodeRepository,
    }),
  ),
  methods: ["PUT"],
  route: "wallet-instances/{id}/status",
});

app.storageQueue("sendEmailOnWalletInstanceCreation", {
  connection: "StorageConnectionString",
  handler: SendEmailOnWalletInstanceCreationFunction({
    emailNotificationService,
    inputDecoder: FiscalCode,
    telemetryClient: appInsightsClient,
  }),
  queueName: config.azure.storage.walletInstances.queues.creationSendEmail.name,
});

app.storageQueue("sendEmailOnWalletInstanceRevocation", {
  connection: "StorageConnectionString",
  handler: SendEmailOnWalletInstanceRevocationFunction({
    emailNotificationService,
    inputDecoder: WalletInstanceRevocationQueueItem,
    telemetryClient: appInsightsClient,
  }),
  queueName:
    config.azure.storage.walletInstances.queues.revocationSendEmail.name,
});

app.http("deleteWalletInstances", {
  authLevel: "function",
  handler: withAppInsights(
    DeleteWalletInstancesFunction({
      credentialRepository: pidIssuerClient,
      telemetryClient: appInsightsClient,
      walletInstanceRepository,
    }),
  ),
  methods: ["DELETE"],
  route: "wallet-instances",
});

// app.cosmosDB("addWalletInstanceUserId", {
//   connection: "CosmosDbEndpoint",
//   containerName: "wallet-instances",
//   databaseName: config.azure.cosmos.dbName,
//   handler: AddWalletInstanceUserIdFunction({
//     inputDecoder: t.array(WalletInstance),
//     telemetryClient: appInsightsClient,
//   }),
//   leaseContainerName: "leases-wallet-instances-user-id",
//   leaseContainerPrefix: "wallet-instances-user-id-",
//   return: output.cosmosDB({
//     connection: "CosmosDbEndpoint",
//     containerName: "wallet-instances-user-id",
//     createIfNotExists: false,
//     databaseName: config.azure.cosmos.dbName,
//   }),
//   startFromBeginning: true,
// });

// this will replace the token endpoint
app.http("createWalletAttestationV2", {
  authLevel: "function",
  handler: withAppInsights(
    CreateWalletAttestationV2Function({
      attestationService: mobileAttestationService,
      attestationServiceConfiguration: config.attestationService,
      certificateRepository,
      federationEntity: config.entityConfiguration.federationEntity,
      nonceRepository,
      notificationService: slackNotificationService,
      signer: walletAttestationSigner,
      telemetryClient: appInsightsClient,
      walletAttestationConfig: {
        ...config.walletProvider.walletAttestation,
        trustAnchorUrl: config.entityConfiguration.trustAnchorUrl,
      },
      walletInstanceRepository,
    }),
  ),
  methods: ["POST"],
  route: "wallet-attestations",
});

app.http("isFiscalCodeWhitelisted", {
  authLevel: "function",
  handler: withAppInsights(
    IsFiscalCodeWhitelistedFunction({
      telemetryClient: appInsightsClient,
      whitelistedFiscalCodeRepository,
    }),
  ),
  methods: ["GET"],
  route: "whitelisted-fiscal-code/{fiscalCode}",
});

app.http("generateCertificateChain", {
  authLevel: "function",
  handler: withAppInsights(
    GenerateCertificateChainFunction({
      certificate: {
        crypto: new Crypto(),
        issuer: certificateIssuerAndSubject,
        subject: certificateIssuerAndSubject,
      },
      certificateRepository,
      federationEntitySigningKeys:
        config.entityConfiguration.federationEntity.jwtSigningConfig.jwks,
      telemetryClient: appInsightsClient,
    }),
  ),
  methods: ["POST"],
  route: "certificate-chain",
});
