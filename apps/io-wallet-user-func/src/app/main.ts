import { CdnManagementClient } from "@azure/arm-cdn";
import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
// import { LogsQueryClient } from "@azure/monitor-query-logs";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { Crypto } from "@peculiar/webcrypto";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";
// import { SlackNotificationService } from "io-wallet-common/infra/slack/notification";

import { getCrlFromUrl } from "@/certificates";
// import { AzureMonitorLogsStatusListAllocationConflictRepository } from "@/infra/azure/applicationinsights/status-list-allocation-conflict";
import { CosmosDbCertificateRepository } from "@/infra/azure/cosmos/certificate";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
// import { CosmosDbOpenStatusListsPolicyRepository } from "@/infra/azure/cosmos/open-status-lists-policy";
// import { CosmosDbStatusListCatalogRepository } from "@/infra/azure/cosmos/status-list-catalog";
// import { CosmosDbStatusListPagesRepository } from "@/infra/azure/cosmos/status-list-pages";
// import { CosmosDbStatusListRoutingRepository } from "@/infra/azure/cosmos/status-list-routing";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
// import { CosmosDbWalletInstanceStatusRepository } from "@/infra/azure/cosmos/wallet-instance-status";
import { CosmosDbWhitelistedFiscalCodeRepository } from "@/infra/azure/cosmos/whitelisted-fiscal-code";
// import { BackfillWalletInstanceStatusFunction } from "@/infra/azure/functions/backfill-wallet-instance-status";
import { CopyWalletInstancesToUatFunction } from "@/infra/azure/functions/copy-wallet-instances-to-uat";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { CreateWalletInstanceAttestationFunction } from "@/infra/azure/functions/create-wallet-instance-attestation";
import { CreateWalletUnitAttestationFunction } from "@/infra/azure/functions/create-wallet-unit-attestation";
import { GenerateCertificateChainFunction } from "@/infra/azure/functions/generate-certificate-chain";
import { GenerateEntityConfigurationFunction } from "@/infra/azure/functions/generate-entity-configuration";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetWalletInstanceStatusFunction } from "@/infra/azure/functions/get-wallet-instance-status";
import { HealthFunction } from "@/infra/azure/functions/health";
import { SendEmailOnWalletInstanceCreationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-creation";
import { SendEmailOnWalletInstanceRevocationFunction } from "@/infra/azure/functions/send-email-on-wallet-instance-revocation";
import { SetWalletInstanceStatusFunction } from "@/infra/azure/functions/set-wallet-instance-status";
// import { StatusListManagerFunction } from "@/infra/azure/functions/status-list-manager";
import { IsFiscalCodeWhitelistedFunction } from "@/infra/azure/functions/whitelisted-fiscal-code";
import { CryptoSigner } from "@/infra/crypto/signer";
import { EmailNotificationServiceClient } from "@/infra/email";
import { WalletInstanceRevocationQueueItem } from "@/infra/handlers/send-email-on-wallet-instance-revocation";
import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  MobileAttestationService,
} from "@/infra/mobile-attestation-service";
import { PidIssuerClient } from "@/infra/pid-issuer/client";
// import { StatusListAllocatorService } from "@/infra/status-list-allocator";
// import { StatusListLifecycleService } from "@/infra/status-list-lifecycle";

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

// const logsQueryClient = new LogsQueryClient(credential);

const database = cosmosClient.database(config.azure.cosmos.dbName);

const nonceRepository = new CosmosDbNonceRepository(database);

const entityConfigurationSigner = new CryptoSigner(
  config.entityConfiguration.federationEntity.jwtSigningConfig,
);

const walletAttestationSigner = new CryptoSigner(
  config.walletProvider.jwtSigningConfig,
);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

// const walletInstanceStatusRepository =
//   new CosmosDbWalletInstanceStatusRepository(database);

const whitelistedFiscalCodeRepository =
  new CosmosDbWhitelistedFiscalCodeRepository(database);

const pidIssuerClient = new PidIssuerClient(
  config.pidIssuer,
  config.entityConfiguration.federationEntity.basePathV10.href,
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

// const slackNotificationService = new SlackNotificationService(config.slack);

const blobServiceClient = new BlobServiceClient(
  `https://${config.azure.storage.entityConfiguration.accountName}.blob.core.windows.net`,
  credential,
);

const containerClient = blobServiceClient.getContainerClient(
  config.azure.storage.entityConfiguration.containerName,
);

const certificateRepository = new CosmosDbCertificateRepository(database);

const certificateV13Repository = new CosmosDbCertificateRepository(
  database,
  "certificates-v-1.3",
);

const certificateIssuerAndSubject = `C=${config.walletProvider.certificate.country}, ST=${config.walletProvider.certificate.state}, L=${config.walletProvider.certificate.locality}, O=${config.entityConfiguration.federationEntity.organizationName}, CN=${config.entityConfiguration.federationEntity.basePathV10.hostname}`;

// const statusListCatalogRepository = new CosmosDbStatusListCatalogRepository(
//   database,
//   config.statusList.pageCount,
//   config.statusList.pageBitsSize,
// );

// const statusListPagesRepository = new CosmosDbStatusListPagesRepository(
//   database,
//   config.statusList.pageCount,
//   config.statusList.pageBitsSize,
// );

// const statusListRoutingRepository = new CosmosDbStatusListRoutingRepository(
//   database,
// );

// const statusListAllocator = new StatusListAllocatorService(
//   statusListCatalogRepository,
//   statusListRoutingRepository,
//   {
//     reservedBlock: undefined,
//   },
//   config.statusList.allocation,
// );

// const statusListLifecycle = new StatusListLifecycleService(
//   statusListCatalogRepository,
//   statusListPagesRepository,
//   statusListRoutingRepository,
//   slackNotificationService,
//   {
//     allocationBlockSize: config.statusList.allocation.blockSize,
//   },
// );

// const openStatusListsPolicyRepository =
//   new CosmosDbOpenStatusListsPolicyRepository(database);

// const statusListAllocationConflictRepository =
//   new AzureMonitorLogsStatusListAllocationConflictRepository({
//     applicationInsightsResourceId: config.azure.applicationInsights.resourceId,
//     client: logsQueryClient,
//   });

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

app.timer("generateEntityConfiguration", {
  handler: GenerateEntityConfigurationFunction({
    cdnManagementClient,
    certificateRepository,
    containerClient,
    endpointName: config.azure.frontDoor.endpointName,
    entityConfiguration: {
      ...config.entityConfiguration,
      authorityHints: [config.entityConfiguration.trustAnchorUrl],
    },
    entityConfigurationSigner,
    inputDecoder: t.unknown,
    profileName: config.azure.frontDoor.profileName,
    resourceGroupName: config.azure.generic.resourceGroupName,
    walletAttestationSigner,
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
    certificateRepository,
    federationEntity: config.entityConfiguration.federationEntity,
    nonceRepository,
    signer: walletAttestationSigner,
    walletAttestationConfig: {
      ...config.walletProvider.walletAttestation,
      trustAnchorUrl: config.entityConfiguration.trustAnchorUrl,
    },
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

app.http("generateCertificateChain", {
  authLevel: "function",
  handler: GenerateCertificateChainFunction({
    certificate: {
      crypto: new Crypto(),
      issuer: certificateIssuerAndSubject,
      subject: certificateIssuerAndSubject,
    },
    certificateRepository,
    federationEntitySigningKeys:
      config.entityConfiguration.federationEntity.jwtSigningConfig.jwks,
  }),
  methods: ["POST"],
  route: "certificate-chain",
});

app.http("createWalletInstanceAttestation", {
  authLevel: "function",
  handler: CreateWalletInstanceAttestationFunction({
    assertionValidationConfig,
    certificateRepository: certificateV13Repository,
    federationEntity: config.entityConfiguration.federationEntity,
    nonceRepository,
    signer: walletAttestationSigner,
    walletAttestationConfig: {
      oauthClientSub: config.walletProvider.walletAttestation.oauthClientSub,
    },
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-instance-attestations",
});

app.http("createWalletUnitAttestation", {
  authLevel: "function",
  handler: CreateWalletUnitAttestationFunction({
    androidAttestationValidationConfig,
    assertionValidationConfig,
    certificateRepository: certificateV13Repository,
    federationEntity: config.entityConfiguration.federationEntity,
    nonceRepository,
    signer: walletAttestationSigner,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-unit-attestations",
});

// app.timer("statusListManager", {
//   handler: StatusListManagerFunction({
//     inputDecoder: t.unknown,
//     openStatusListsPolicyRepository,
//     statusListAllocationConflictRepository,
//     statusListLifecycle,
//     statusListManagerConfig: {
//       ...config.statusList.manager,
//       capacityPerNewStatusList: config.statusList.capacityBits,
//     },
//   }),
//   schedule: "0 */15 * * * *",
// });

// app.cosmosDB("backfillWalletInstanceStatus", {
//   connection: "CosmosDbEndpoint",
//   containerName: "wallet-instances",
//   createLeaseContainerIfNotExists: false,
//   databaseName: config.azure.cosmos.dbName,
//   handler: BackfillWalletInstanceStatusFunction({
//     inputDecoder: t.array(t.unknown),
//     statusListAllocator,
//     walletInstanceStatusRepository,
//   }),
//   leaseContainerName: "wallet-instance-status-migration-leases",
//   maxItemsPerInvocation: 50,
//   startFromBeginning: true,
// });

app.cosmosDB("copyWalletInstancesToUat", {
  connection: "PagoPACosmosDbConnectionString",
  containerName: "wallet-instances",
  createLeaseContainerIfNotExists: false,
  databaseName: "db",
  handler: CopyWalletInstancesToUatFunction({
    inputDecoder: t.array(t.unknown),
  }),
  leaseContainerName: "wallet-instances-uat-copy-leases",
  maxItemsPerInvocation: 50,
  return: output.cosmosDB({
    connection: "CosmosDbEndpoint",
    containerName: "wallet-instances",
    createIfNotExists: false,
    databaseName: "db-uat",
  }),
  startFromBeginning: true,
});
