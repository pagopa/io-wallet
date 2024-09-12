import { CosmosDbWalletInstanceRepository } from "@/infra/azure/cosmos/wallet-instance";
import { GetCurrentWalletInstanceByFiscalCodeFunction } from "@/infra/azure/functions/get-current-wallet-instance-by-fiscal-code";
import { HealthFunction } from "@/infra/azure/functions/health";
import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import { PdvTokenizerClient } from "io-wallet-common/infra/pdv-tokenizer/client";

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
    requestTimeout: 3000, // TODO [SIW-1331]: check this timeout
  },
  endpoint: config.azure.cosmos.endpoint,
});

const database = cosmosClient.database(config.azure.cosmos.dbName);

const walletInstanceRepository = new CosmosDbWalletInstanceRepository(database);

const pdvTokenizerClient = new PdvTokenizerClient(config.pdvTokenizer);

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({
    cosmosClient,
    pdvTokenizerClient,
  }),
  methods: ["GET"],
  route: "health",
});

app.http("getCurrentWalletInstanceByFiscalCode", {
  authLevel: "function",
  handler: GetCurrentWalletInstanceByFiscalCodeFunction({
    userRepository: pdvTokenizerClient,
    walletInstanceRepository,
  }),
  methods: ["POST"],
  route: "wallet-instances/current",
});
