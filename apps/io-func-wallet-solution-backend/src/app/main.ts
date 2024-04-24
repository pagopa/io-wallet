import { app } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

import * as E from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";

import { getConfigFromEnvironment } from "./config";
import { GetEntityConfigurationFunction } from "@/infra/azure/functions/get-entity-configuration";
import { InfoFunction } from "@/infra/azure/functions/info";
import { CryptoSigner } from "@/infra/crypto/signer";
import { CreateWalletAttestationFunction } from "@/infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { GetNonceFunction } from "@/infra/azure/functions/get-nonce";
import { CosmosDbNonceRepository } from "@/infra/azure/cosmos/nonce";

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

app.http("healthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "info",
  handler: InfoFunction({ cosmosClient }),
});

app.http("createWalletAttestation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "token",
  handler: CreateWalletAttestationFunction({
    federationEntityMetadata: config.federationEntity,
    signer,
  }),
});

app.http("createWalletInstance", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "wallet-instance",
  handler: CreateWalletInstanceFunction({
    attestationServiceConfiguration: config.attestationService,
    nonceRepository,
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
  authLevel: "anonymous",
  route: "nonce",
  handler: GetNonceFunction({ nonceRepository }),
});
