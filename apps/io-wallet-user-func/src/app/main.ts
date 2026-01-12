import { CdnManagementClient } from "@azure/arm-cdn";
import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueServiceClient } from "@azure/storage-queue";
import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { Crypto } from "@peculiar/webcrypto";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { WalletInstance } from "io-wallet-common/wallet-instance";

import { getCrlFromUrl } from "@/certificates";
import { CosmosDbCertificateRepository } from "@/infra/azure/cosmos/certificate";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { CosmosDbWhitelistedFiscalCodeRepository } from "@/infra/azure/cosmos/whitelisted-fiscal-code";
// import { AddWalletInstanceUserIdFunction } from "@/infra/azure/functions/add-wallet-instance-user-id";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { DeleteWalletInstancesFunction } from "@/infra/azure/functions/delete-wallet-instances";
import { GenerateCertificateChainFunction } from "@/infra/azure/functions/generate-certificate-chain";
import { GenerateEntityConfigurationFunction } from "@/infra/azure/functions/generate-entity-configuration";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetWalletInstanceStatusFunction } from "@/infra/azure/functions/get-wallet-instance-status";
import { HealthFunction } from "@/infra/azure/functions/health";
import { MigrateWalletInstancesFunction } from "@/infra/azure/functions/migrate-wallet-instances";
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

// const cosmosClient = new CosmosClient({
//   aadCredentials: credential,
//   connectionPolicy: {
//     requestTimeout: config.azure.cosmos.requestTimeout,
//   },
//   endpoint: config.azure.cosmos.endpoint,
// });

const cosmosClient = new CosmosClient({
  connectionPolicy: {
    requestTimeout: config.azure.cosmos.requestTimeout,
  },
  connectionString: config.azure.cosmos.connectionString,
});

const subscriptionId = config.azure.generic.subscriptionId;

const cdnManagementClient = new CdnManagementClient(credential, subscriptionId);

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

const mobileAttestationService = new MobileAttestationService(
  config.attestationService,
);

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
  handler: HealthFunction({
    cosmosClient,
    pidIssuerClient,
  }),
  methods: ["GET"],
  route: "health",
});

app.http("createWalletInstance", {
  authLevel: "function",
  handler: CreateWalletInstanceFunction({
    attestationService: mobileAttestationService,
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
  connection: "StorageConnectionString",
  handler: SendEmailOnWalletInstanceCreationFunction({
    emailNotificationService,
    inputDecoder: FiscalCode,
    whitelistedFiscalCodeRepository,
  }),
  queueName: config.azure.storage.walletInstances.queues.creationSendEmail.name,
});

app.storageQueue("sendEmailOnWalletInstanceRevocation", {
  connection: "StorageConnectionString",
  handler: SendEmailOnWalletInstanceRevocationFunction({
    emailNotificationService,
    inputDecoder: WalletInstanceRevocationQueueItem,
    whitelistedFiscalCodeRepository,
  }),
  queueName:
    config.azure.storage.walletInstances.queues.revocationSendEmail.name,
});

app.http("deleteWalletInstances", {
  authLevel: "function",
  handler: DeleteWalletInstancesFunction({
    credentialRepository: pidIssuerClient,
    walletInstanceRepository,
  }),
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

app.cosmosDB("migrateWalletInstances", {
  connection: "PagoPACosmosDbConnectionString",
  containerName: "wallet-instances",
  createLeaseCollectionIfNotExists: false,
  databaseName: "db",
  handler: MigrateWalletInstancesFunction({
    inputDecoder: t.array(WalletInstance),
  }),
  leaseContainerName: "leases-migration",
  maxItemsPerInvocation: 50,
  return: output.cosmosDB({
    connection: "CosmosDbEndpoint",
    containerName: "wallet-instances",
    createIfNotExists: false,
    databaseName: "db",
  }),
  startFromBeginning: true,
});
