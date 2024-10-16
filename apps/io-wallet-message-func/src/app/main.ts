import { HealthFunction } from "@/infra/azure/functions/health";
import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";
import { getAppConfigFromEnvironment } from "./configs/config";

const configOrError = pipe(
  getAppConfigFromEnvironment(process.env),
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

const database = cosmosClient.database(config.azure.cosmos.dbName);

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({ cosmosClient }),
  methods: ["GET"],
  route: "health",
});

// to do - add event listener (service bus topic)
