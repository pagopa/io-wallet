import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { CreateWalletInstanceFunction } from "@/infra/azure/functions/create-wallet-instance";
import { GetCurrentWalletInstanceStatusFunction } from "@/infra/azure/functions/get-current-wallet-instance-status";
import { HealthFunction } from "@/infra/azure/functions/health";
import { WalletInstanceValid } from "@/wallet-instance";
import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";

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

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({ cosmosClient }),
  methods: ["GET"],
  route: "health",
});

app.http("getCurrentWalletInstanceStatus", {
  authLevel: "function",
  handler: GetCurrentWalletInstanceStatusFunction({ walletInstanceRepository }),
  methods: ["GET"],
  route: "wallet-instances/current/status",
});

app.storageQueue("createWalletInstance", {
  connection: "StorageAccount",
  handler: CreateWalletInstanceFunction({
    inputDecoder: WalletInstanceValid,
    walletInstanceRepository,
  }),
  queueName: "on-wallet-instance-created",
});
