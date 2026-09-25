import { CdnManagementClient } from "@azure/arm-cdn";
import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { CryptographyClient } from "@azure/keyvault-keys";
import { LogsQueryClient } from "@azure/monitor-query-logs";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { SlackNotificationService } from "io-wallet-common/infra/slack/notification";

import { getCrlFromUrl } from "@/certificates";
import { AzureMonitorLogsStatusListAllocationConflictRepository } from "@/infra/azure/applicationinsights/status-list-allocation-conflict";
import { CosmosDbKeyRepository } from "@/infra/azure/cosmos/key";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { CosmosDbOpenStatusListsPolicyRepository } from "@/infra/azure/cosmos/open-status-lists-policy";
import { CosmosDbStatusListCatalogRepository } from "@/infra/azure/cosmos/status-list-catalog";
import { CosmosDbStatusListPagesRepository } from "@/infra/azure/cosmos/status-list-pages";
import { CosmosDbStatusListRoutingRepository } from "@/infra/azure/cosmos/status-list-routing";
import { CosmosDbTrustMarkRepository } from "@/infra/azure/cosmos/trust-mark";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { CosmosDbWhitelistedFiscalCodeRepository } from "@/infra/azure/cosmos/whitelisted-fiscal-code";
import { CreateKeyAttestationFunction } from "@/infra/azure/functions/create-key-attestation";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { CreateWalletInstanceAttestationFunction } from "@/infra/azure/functions/create-wallet-instance-attestation";
import { GenerateEntityConfigurationV1Function } from "@/infra/azure/functions/generate-entity-configuration-v1";
import { GenerateEntityConfigurationV2Function } from "@/infra/azure/functions/generate-entity-configuration-v2";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetWalletInstanceStatusFunction } from "@/infra/azure/functions/get-wallet-instance-status";
import { HealthFunction } from "@/infra/azure/functions/health";
import { RevokeWalletInstancesFunction } from "@/infra/azure/functions/revoke-wallet-instances";
import { SendEmailOnWalletInstanceCreationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-creation";
import { SendEmailOnWalletInstanceRevocationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-revocation";
import { SetWalletInstanceStatusFunction } from "@/infra/azure/functions/set-wallet-instance-status";
import { SetWalletInstancesStatusFunction } from "@/infra/azure/functions/set-wallet-instances-status";
import { StatusListManagerFunction } from "@/infra/azure/functions/status-list-manager";
import { StatusListPublicationFunction } from "@/infra/azure/functions/status-list-publication";
import { StatusListPublicationDispatcherFunction } from "@/infra/azure/functions/status-list-publication-dispatcher";
import { StatusListPublicationMonitorFunction } from "@/infra/azure/functions/status-list-publication-monitor";
import { IsFiscalCodeWhitelistedFunction } from "@/infra/azure/functions/whitelisted-fiscal-code";
import { EmailNotificationServiceClient } from "@/infra/email";
import { WalletInstanceRevocationQueueItem } from "@/infra/handlers/send-email-on-wallet-instance-revocation";
import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  MobileAttestationService,
} from "@/infra/mobile-attestation-service";
import { PidIssuerClient } from "@/infra/pid-issuer/client";
import { StatusListAllocatorService } from "@/infra/status-list-allocator";
import { createStatusListBitRevocation } from "@/infra/status-list-bit-revocation";
import { StatusListLifecycleService } from "@/infra/status-list-lifecycle";
import { StatusListPublicationService } from "@/infra/status-list-publication";

import { getConfigFromEnvironment } from "./config";

registerAzureFunctionHooks(app);

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity),
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

const credential = new DefaultAzureCredential();

const createCryptographyClient = (keyName: string) =>
  new CryptographyClient(
    `${config.azure.keyVault.url.replace(/\/$/, "")}/keys/${keyName}`,
    credential,
  );

const entityConfigurationV1CryptographyClient = createCryptographyClient(
  config.entityConfigurationV1.signingKeyName,
);

const entityConfigurationV2CryptographyClient = createCryptographyClient(
  config.entityConfigurationV2.signingKeyName,
);

const keyAttestationCryptographyClient = createCryptographyClient(
  config.walletProvider.keyAttestationSigningKeyName,
);

const tokenStatusListCryptographyClient = createCryptographyClient(
  config.walletProvider.tokenStatusListSigningKeyName,
);

const walletAttestationCryptographyClient = createCryptographyClient(
  config.walletProvider.walletAttestationSigningKeyName,
);

const walletInstanceAttestationCryptographyClient = createCryptographyClient(
  config.walletProvider.walletInstanceAttestationSigningKeyName,
);

const cosmosClient = new CosmosClient({
  aadCredentials: credential,
  connectionPolicy: {
    requestTimeout: config.azure.cosmos.requestTimeout,
  },
  endpoint: config.azure.cosmos.endpoint,
});

const subscriptionId = config.azure.generic.subscriptionId;

const cdnManagementClient = new CdnManagementClient(credential, subscriptionId);

const queueServiceClient = new QueueServiceClient(
  config.azure.storage.walletInstances.url,
  credential,
);

const walletInstanceCreationEmailQueueClient =
  queueServiceClient.getQueueClient(
    config.azure.storage.walletInstances.queues.creationSendEmail.name,
  );

const walletInstanceRevocationEmailQueueClient =
  queueServiceClient.getQueueClient(
    config.azure.storage.walletInstances.queues.revocationSendEmail.name,
  );

const statusListPublicationQueueClient = queueServiceClient.getQueueClient(
  config.azure.storage.statusLists.publicationQueue.name,
);

const logsQueryClient = new LogsQueryClient(credential);

const database = cosmosClient.database(config.azure.cosmos.dbName);

const nonceRepository = new CosmosDbNonceRepository(database);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

const whitelistedFiscalCodeRepository =
  new CosmosDbWhitelistedFiscalCodeRepository(database);

const pidIssuerClient = new PidIssuerClient(
  config.pidIssuer,
  config.entityConfigurationV1.federationEntityId.href,
);

const mobileAttestationService = new MobileAttestationService(
  config.attestationService,
);

const assertionValidationConfig: AssertionValidationConfig = {
  allowedDeveloperUsers: config.attestationService.allowedDeveloperUsers,
  androidBundleIdentifiers: config.attestationService.androidBundleIdentifiers,
  androidPlayIntegrityUrl: config.attestationService.androidPlayIntegrityUrl,
  androidPlayStoreCertificateHash:
    config.attestationService.androidPlayStoreCertificateHash,
  googleAppCredentialsEncoded:
    config.attestationService.googleAppCredentialsEncoded,
  iosBundleIdentifiers: config.attestationService.iosBundleIdentifiers,
  iOsTeamIdentifier: config.attestationService.iOsTeamIdentifier,
};

const androidAttestationValidationConfig: AndroidAttestationValidationConfig = {
  androidBundleIdentifiers: config.attestationService.androidBundleIdentifiers,
  androidCrlUrl: config.attestationService.androidCrlUrl,
  googlePublicKeys: config.attestationService.googlePublicKeys,
  httpRequestTimeout: config.attestationService.httpRequestTimeout,
};

const emailNotificationService = new EmailNotificationServiceClient({
  authProfileApiConfig: config.authProfile,
  mailConfig: config.mail,
});

const slackNotificationService = new SlackNotificationService(config.slack);

const entityConfigurationV1BlobServiceClient = new BlobServiceClient(
  `https://${config.azure.storage.entityConfigurationV1.accountName}.blob.core.windows.net`,
  credential,
);

const entityConfigurationV2BlobServiceClient = new BlobServiceClient(
  `https://${config.azure.storage.entityConfigurationV2.accountName}.blob.core.windows.net`,
  credential,
);

const entityConfigurationV1ContainerClient =
  entityConfigurationV1BlobServiceClient.getContainerClient(
    config.azure.storage.entityConfigurationV1.containerName,
  );

const entityConfigurationV2ContainerClient =
  entityConfigurationV2BlobServiceClient.getContainerClient(
    config.azure.storage.entityConfigurationV2.containerName,
  );

const statusListBlobServiceClient = new BlobServiceClient(
  `https://${config.azure.storage.statusLists.accountName}.blob.core.windows.net`,
  credential,
);

const statusListContainerClient =
  statusListBlobServiceClient.getContainerClient(
    config.azure.storage.statusLists.containerName,
  );

const keyRepository = new CosmosDbKeyRepository(database);

const keyV1Repository = new CosmosDbKeyRepository(database, "keys-1.0");

const trustMarkRepository = new CosmosDbTrustMarkRepository(database);

const statusListCatalogRepository = new CosmosDbStatusListCatalogRepository(
  database,
  config.statusList.pageCount,
  config.statusList.pageBitsSize,
);

const statusListPagesRepository = new CosmosDbStatusListPagesRepository(
  database,
  config.statusList.pageCount,
  config.statusList.pageBitsSize,
);

const statusListRoutingRepository = new CosmosDbStatusListRoutingRepository(
  database,
);

const statusListBitRevocation = createStatusListBitRevocation(
  statusListPagesRepository,
);

const statusListPublicationConfig = {
  baseUrl: config.statusList.publication.baseUrl.href,
  endpointName: config.azure.frontDoor.endpointName,
  profileName: config.azure.frontDoor.profileName,
  resourceGroupName: config.azure.generic.resourceGroupName,
};

const statusListPublication = new StatusListPublicationService({
  catalogs: statusListCatalogRepository,
  cdnManagementClient,
  config: statusListPublicationConfig,
  containerClient: statusListContainerClient,
  cryptographyClient: tokenStatusListCryptographyClient,
  emptyBitstring: Buffer.alloc(
    (config.statusList.pageCount * config.statusList.pageBitsSize) / 8,
  ),
  keyRepository,
  pages: statusListPagesRepository,
  tokenStatusListSigningKeyName:
    config.walletProvider.tokenStatusListSigningKeyName,
});

const statusListAllocator = new StatusListAllocatorService(
  statusListCatalogRepository,
  statusListRoutingRepository,
  config.statusList.allocation,
);

const statusListLifecycle = new StatusListLifecycleService(
  statusListCatalogRepository,
  statusListPagesRepository,
  statusListPublication,
  statusListRoutingRepository,
  slackNotificationService,
  {
    allocationBlockSize: config.statusList.allocation.blockSize,
  },
);

const openStatusListsPolicyRepository =
  new CosmosDbOpenStatusListsPolicyRepository(database);

const statusListManagerIntervalMinutes = 15;

const statusListAllocationConflictRepository =
  new AzureMonitorLogsStatusListAllocationConflictRepository({
    applicationInsightsResourceId: config.azure.applicationInsights.resourceId,
    client: logsQueryClient,
    queryDuration: `PT${statusListManagerIntervalMinutes}M`,
  });

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({
    cosmosClient,
  }),
  methods: ["GET"],
  route: "health",
});

app.http("createWalletInstance", {
  authLevel: "function",
  handler: CreateWalletInstanceFunction({
    attestationService: mobileAttestationService,
    credentialRepository: pidIssuerClient,
    nonceRepository,
    queueClient: walletInstanceCreationEmailQueueClient,
    statusListAllocator,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-instances",
});

app.http("getNonce", {
  authLevel: "function",
  handler: GetNonceFunction({
    nonceRepository,
  }),
  methods: ["GET"],
  route: "nonce",
});

// V1 version
app.timer("generateEntityConfiguration", {
  handler: GenerateEntityConfigurationV1Function({
    cdnManagementClient,
    containerClient: entityConfigurationV1ContainerClient,
    cryptographyClient: entityConfigurationV1CryptographyClient,
    endpointName: config.azure.frontDoor.endpointName,
    entityConfigurationJwt: config.entityConfigurationV1,
    inputDecoder: t.unknown,
    keyRepository: keyV1Repository,
    profileName: config.azure.frontDoor.profileName,
    resourceGroupName: config.azure.generic.resourceGroupName,
  }),
  schedule: "0 0 */12 * * *", // the function returns a jwt that is valid for 24 hours, so the trigger is set every 12 hours
});

// V2 version
app.timer("generateEntityConfigurationV2", {
  handler: GenerateEntityConfigurationV2Function({
    cdnManagementClient,
    containerClient: entityConfigurationV2ContainerClient,
    cryptographyClient: entityConfigurationV2CryptographyClient,
    endpointName: config.azure.frontDoor.endpointName,
    entityConfigurationJwt: config.entityConfigurationV2,
    inputDecoder: t.unknown,
    keyRepository: keyRepository,
    profileName: config.azure.frontDoor.profileName,
    resourceGroupName: config.azure.generic.resourceGroupName,
    trustMarkRepository,
  }),
  schedule: "0 0 */12 * * *", // the function returns a jwt that is valid for 24 hours, so the trigger is set every 12 hours
});

app.http("getWalletInstanceStatus", {
  authLevel: "function",
  handler: GetWalletInstanceStatusFunction({
    credentialRepository: pidIssuerClient,
    getAttestationStatusList: () =>
      getCrlFromUrl(
        config.attestationService.androidCrlUrl,
        config.attestationService.httpRequestTimeout,
      ),
    walletInstanceRepository,
  }),
  methods: ["GET"],
  route: "wallet-instances/{id}/status",
});

app.http("getCurrentWalletInstanceStatus", {
  authLevel: "function",
  handler: GetCurrentWalletInstanceStatusFunction({
    walletInstanceRepository,
  }),
  methods: ["GET"],
  route: "wallet-instances/current/status",
});

app.http("setWalletInstanceStatus", {
  authLevel: "function",
  handler: SetWalletInstanceStatusFunction({
    credentialRepository: pidIssuerClient,
    queueClient: walletInstanceRevocationEmailQueueClient,
    walletInstanceRepository,
  }),
  methods: ["PUT"],
  route: "wallet-instances/{id}/status",
});

app.http("setWalletInstancesStatus", {
  authLevel: "function",
  handler: SetWalletInstancesStatusFunction({
    walletInstanceRepository,
  }),
  methods: ["PUT"],
  route: "wallet-instances/status",
});

app.storageQueue("sendEmailOnWalletInstanceCreation", {
  connection: "WalletInstanceStorageAccount",
  handler: SendEmailOnWalletInstanceCreationFunction({
    emailNotificationService,
    inputDecoder: FiscalCode,
    whitelistedFiscalCodeRepository,
  }),
  queueName: config.azure.storage.walletInstances.queues.creationSendEmail.name,
});

app.storageQueue("sendEmailOnWalletInstanceRevocation", {
  connection: "WalletInstanceStorageAccount",
  handler: SendEmailOnWalletInstanceRevocationFunction({
    emailNotificationService,
    inputDecoder: WalletInstanceRevocationQueueItem,
    whitelistedFiscalCodeRepository,
  }),
  queueName:
    config.azure.storage.walletInstances.queues.revocationSendEmail.name,
});

app.http("createWalletAttestation", {
  authLevel: "function",
  handler: CreateWalletAttestationFunction({
    attestationService: mobileAttestationService,
    cryptographyClient: walletAttestationCryptographyClient,
    federationEntityId: config.entityConfigurationV1.federationEntityId,
    keyRepository,
    nonceRepository,
    walletAttestationConfig: config.walletProvider.walletAttestation,
    walletAttestationSigningKeyName:
      config.walletProvider.walletAttestationSigningKeyName,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-attestations",
});

app.http("isFiscalCodeWhitelisted", {
  authLevel: "function",
  handler: IsFiscalCodeWhitelistedFunction({
    whitelistedFiscalCodeRepository,
  }),
  methods: ["GET"],
  route: "whitelisted-fiscal-code/{fiscalCode}",
});

app.http("createWalletInstanceAttestation", {
  authLevel: "function",
  handler: CreateWalletInstanceAttestationFunction({
    assertionValidationConfig,
    cryptographyClient: walletInstanceAttestationCryptographyClient,
    federationEntityId: config.entityConfigurationV2.federationEntityId,
    keyRepository,
    nonceRepository,
    walletAttestationConfig: {
      oauthClientSub: config.walletProvider.walletAttestation.oauthClientSub,
    },
    walletInstanceAttestationSigningKeyName:
      config.walletProvider.walletInstanceAttestationSigningKeyName,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-instance-attestations",
});

app.http("createKeyAttestation", {
  authLevel: "function",
  handler: CreateKeyAttestationFunction({
    androidAttestationValidationConfig,
    assertionValidationConfig,
    cryptographyClient: keyAttestationCryptographyClient,
    federationEntityId: config.entityConfigurationV2.federationEntityId,
    keyAttestationSigningKeyName:
      config.walletProvider.keyAttestationSigningKeyName,
    keyRepository,
    nonceRepository,
    statusListBaseUrl: statusListPublicationConfig.baseUrl,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "key-attestations",
});

app.timer("statusListManager", {
  handler: StatusListManagerFunction({
    inputDecoder: t.unknown,
    openStatusListsPolicyRepository,
    statusListAllocationConflictRepository,
    statusListLifecycle,
    statusListManagerConfig: {
      ...config.statusList.manager,
      capacityPerNewStatusList: config.statusList.capacityBits,
    },
  }),
  schedule: `0 */${statusListManagerIntervalMinutes} * * * *`,
});

app.timer("statusListPublicationDispatcher", {
  handler: StatusListPublicationDispatcherFunction({
    inputDecoder: t.unknown,
    queueClient: statusListPublicationQueueClient,
    statusListPublication,
  }),
  schedule: "0 0 * * * *", // every hour
});

app.timer("statusListPublicationMonitor", {
  handler: StatusListPublicationMonitorFunction({
    inputDecoder: t.unknown,
    statusListPublication,
    statusListPublicationMonitorConfig: {
      baseUrl: statusListPublicationConfig.baseUrl,
    },
  }),
  schedule: "0 */10 * * * *", // every 10 minutes
});

app.storageQueue("statusListPublication", {
  connection: "StatusListPublicationQueueStorageAccount",
  handler: StatusListPublicationFunction({
    inputDecoder: t.type({
      statusListId: NonEmptyString,
    }),
    statusListPublication,
  }),
  queueName: config.azure.storage.statusLists.publicationQueue.name,
});

app.cosmosDB("revokeWalletInstances", {
  connection: "CosmosDbEndpoint",
  containerName: "wallet-instances",
  createLeaseCollectionIfNotExists: false,
  databaseName: config.azure.cosmos.dbName,
  handler: RevokeWalletInstancesFunction({
    inputDecoder: t.array(t.unknown),
    statusListBitRevocation,
  }),
  leaseContainerName: "leases-revoke-wallet-instances",
});
