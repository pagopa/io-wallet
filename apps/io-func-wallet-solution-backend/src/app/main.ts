import { app } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

import * as E from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";

import { getConfigFromEnvironment } from "./config";
import { GetEntityConfigurationFunction } from "@/infra/azure/functions/get-entity-configuration";
import { HealthFunction } from "@/infra/azure/functions/health";
import { CryptoSigner } from "@/infra/crypto/signer";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { GetUserByFiscalCodeFunction } from "@/infra/azure/functions/get-user-by-fiscal-code";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";
import { PdvTokenizerClient } from "@/infra/pdv-tokenizer/client";
import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity)
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

const cosmosClient = new CosmosClient(config.azure.cosmos.connectionString);
const database = cosmosClient.database(config.azure.cosmos.dbName);

const nonceRepository = new CosmosDbNonceRepository(database);

const signer = new CryptoSigner(config.crypto);

const pdvTokenizerClient = new PdvTokenizerClient(config.pdvTokenizer);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

app.http("healthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: HealthFunction({ cosmosClient, pdvTokenizerClient }),
});

app.http("createWalletAttestation", {
  methods: ["POST"],
  authLevel: "function",
  route: "token",
  handler: CreateWalletAttestationFunction({
    federationEntityMetadata: config.federationEntity,
    signer,
    nonceRepository,
    walletInstanceRepository,
    attestationServiceConfiguration: config.attestationService,
  }),
});

app.http("createWalletInstance", {
  methods: ["POST"],
  authLevel: "function",
  route: "wallet-instance",
  handler: CreateWalletInstanceFunction({
    attestationServiceConfiguration: config.attestationService,
    nonceRepository,
    walletInstanceRepository,
  }),
});

app.http("getEntityConfiguration", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: ".well-known/openid-federation",
  handler: GetEntityConfigurationFunction({
    federationEntityMetadata: config.federationEntity,
    signer,
  }),
});

app.http("getNonce", {
  methods: ["GET"],
  authLevel: "function",
  route: "nonce",
  handler: GetNonceFunction({ nonceRepository }),
});

app.http("getUserByFiscalCode", {
  methods: ["POST"],
  authLevel: "function",
  route: "users",
  handler: GetUserByFiscalCodeFunction({
    userRepository: pdvTokenizerClient,
  }),
});
