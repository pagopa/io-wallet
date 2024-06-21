import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { GenerateEntityConfigurationFunction } from "@/infra/azure/functions/generate-entity-configuration";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetUserByFiscalCodeFunction } from "@/infra/azure/functions/get-user-by-fiscal-code";
import { HealthFunction } from "@/infra/azure/functions/health";
import { CryptoSigner } from "@/infra/crypto/signer";
import { PdvTokenizerClient } from "@/infra/pdv-tokenizer/client";
import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { QueueServiceClient } from "@azure/storage-queue";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import * as t from "io-ts";

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
  endpoint: config.azure.cosmos.endpoint,
});

const database = cosmosClient.database(config.azure.cosmos.dbName);

const nonceRepository = new CosmosDbNonceRepository(database);

const signer = new CryptoSigner(config.crypto);

const pdvTokenizerClient = new PdvTokenizerClient(config.pdvTokenizer);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

const queueServiceClient = new QueueServiceClient(
  config.azure.storage.walletInstances.queueServiceUrl,
  credential,
);

const onWalletInstanceCreatedQueueClient = queueServiceClient.getQueueClient(
  "on-wallet-instance-created",
);

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({
    cosmosClient,
    pdvTokenizerClient,
    queueClient: onWalletInstanceCreatedQueueClient,
  }),
  methods: ["GET"],
  route: "health",
});

app.http("createWalletAttestation", {
  authLevel: "function",
  handler: CreateWalletAttestationFunction({
    attestationServiceConfiguration: config.attestationService,
    federationEntityMetadata: config.federationEntity,
    nonceRepository,
    signer,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "token",
});

app.http("createWalletInstance", {
  authLevel: "function",
  handler: CreateWalletInstanceFunction({
    attestationServiceConfiguration: config.attestationService,
    nonceRepository,
    queueClient: onWalletInstanceCreatedQueueClient,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-instances",
});

app.http("getNonce", {
  authLevel: "function",
  handler: GetNonceFunction({ nonceRepository }),
  methods: ["GET"],
  route: "nonce",
});

app.http("getUserByFiscalCode", {
  authLevel: "function",
  handler: GetUserByFiscalCodeFunction({
    userRepository: pdvTokenizerClient,
  }),
  methods: ["POST"],
  route: "users",
});

app.timer("generateEntityConfiguration", {
  handler: GenerateEntityConfigurationFunction({
    federationEntityMetadata: config.federationEntity,
    inputDecoder: t.unknown,
    signer,
  }),
  return: output.storageBlob({
    connection: "EntityConfigurationStorageAccount",
    path: `${config.azure.storage.entityConfiguration.containerName}/openid-federation`,
  }),
  schedule: "0 0 */12 * * *", // the function returns a jwt that is valid for 24 hours, so the trigger is set every 12 hours
});
