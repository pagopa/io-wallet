import ai from "@/infra/azure/appinsights/start";
import withAppInsights from "@/infra/azure/appinsights/wrapper-handler";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { AddWalletInstanceToValidationQueueFunction } from "@/infra/azure/functions/add-wallet-instance-to-validation-queue";
import { AddWalletInstanceUserIdFunction } from "@/infra/azure/functions/add-wallet-instance-user-id";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletAttestationV2Function } from "@/infra/azure/functions/create-wallet-attestation-v2";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { DeleteWalletInstancesFunction } from "@/infra/azure/functions/delete-wallet-instances";
import { GenerateEntityConfigurationFunction } from "@/infra/azure/functions/generate-entity-configuration";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetWalletInstanceStatusFunction } from "@/infra/azure/functions/get-wallet-instance-status";
import { HealthFunction } from "@/infra/azure/functions/health";
import { SendEmailOnWalletInstanceCreationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-creation";
import { SendEmailOnWalletInstanceRevocationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-revocation";
import { SetWalletInstanceStatusFunction } from "@/infra/azure/functions/set-wallet-instance-status";
import { ValidateWalletInstanceAttestedKeyFunction } from "@/infra/azure/functions/validate-wallet-instance-attested-key";
import { WalletInstanceRevocationStorageQueue } from "@/infra/azure/storage/wallet-instance-revocation";
import { CryptoSigner } from "@/infra/crypto/signer";
import { EmailNotificationServiceClient } from "@/infra/email";
import { WalletInstanceRevocationQueueItem } from "@/infra/handlers/send-email-on-wallet-instance-revocation";
import { MobileAttestationService } from "@/infra/mobile-attestation-service";
import { PidIssuerClient } from "@/infra/pid-issuer/client";
import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { QueueServiceClient } from "@azure/storage-queue";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { SlackNotificationService } from "io-wallet-common/infra/slack/notification";
import {
  WalletInstance,
  WalletInstanceValid,
  WalletInstanceValidWithAndroidCertificatesChain,
} from "io-wallet-common/wallet-instance";

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

const walletInstanceRevocationQueue = new WalletInstanceRevocationStorageQueue(
  queueServiceClient.getQueueClient(
    config.azure.storage.walletInstances.queues.validateCertificates.name,
  ),
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

const signer = new CryptoSigner(config.crypto);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

const pidIssuerClient = new PidIssuerClient(
  config.pidIssuer,
  config.federationEntity.basePath.href,
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
      federationEntityMetadata: config.federationEntity,
      nonceRepository,
      signer,
      telemetryClient: appInsightsClient,
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
    federationEntityMetadata: config.federationEntity,
    inputDecoder: t.unknown,
    signer,
    telemetryClient: appInsightsClient,
  }),
  return: output.storageBlob({
    connection: "EntityConfigurationStorageAccount",
    path: `${config.azure.storage.entityConfiguration.containerName}/openid-federation`,
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
      telemetryClient: appInsightsClient,
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
    }),
  ),
  methods: ["PUT"],
  route: "wallet-instances/{id}/status",
});

app.cosmosDB("addWalletInstanceToValidationQueue", {
  connection: "CosmosDbEndpoint",
  containerName: "wallet-instances",
  databaseName: config.azure.cosmos.dbName,
  handler: AddWalletInstanceToValidationQueueFunction({
    inputDecoder: t.array(WalletInstance),
    telemetryClient: appInsightsClient,
  }),
  leaseContainerName: "leases-revoke-wallet-instance",
  leaseContainerPrefix: "wallet-instances-consumer-",
  maxItemsPerInvocation: 50,
  return: output.storageQueue({
    connection: "StorageConnectionString",
    queueName:
      config.azure.storage.walletInstances.queues.validateCertificates.name,
  }),
  startFromBeginning: true,
});

app.storageQueue("validateWalletInstance", {
  connection: "StorageConnectionString",
  handler: ValidateWalletInstanceAttestedKeyFunction({
    attestationServiceConfiguration: config.attestationService,
    inputDecoder: WalletInstanceValidWithAndroidCertificatesChain,
    notificationService: slackNotificationService,
    revocationQueue: walletInstanceRevocationQueue,
    telemetryClient: appInsightsClient,
    walletInstanceRepository,
  }),
  queueName:
    config.azure.storage.walletInstances.queues.validateCertificates.name,
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

app.cosmosDB("addWalletInstanceUserId", {
  connection: "CosmosDbEndpoint",
  containerName: "wallet-instances",
  databaseName: config.azure.cosmos.dbName,
  handler: AddWalletInstanceUserIdFunction({
    inputDecoder: t.array(WalletInstanceValid),
    telemetryClient: appInsightsClient,
  }),
  leaseContainerName: "leases-wallet-instances-user-id",
  leaseContainerPrefix: "wallet-instances-user-id-",
  return: output.cosmosDB({
    connection: "CosmosDbEndpoint",
    containerName: "wallet-instances-user-id",
    createIfNotExists: false,
    databaseName: config.azure.cosmos.dbName,
  }),
  startFromBeginning: true,
});

// this will be the new token endpoint
app.http("createWalletAttestationV2", {
  authLevel: "function",
  handler: withAppInsights(
    CreateWalletAttestationV2Function({
      attestationService: mobileAttestationService,
      federationEntityMetadata: config.federationEntity,
      nonceRepository,
      signer,
      telemetryClient: appInsightsClient,
      walletInstanceRepository,
    }),
  ),
  methods: ["POST"],
  route: "wallet-attestation",
});
