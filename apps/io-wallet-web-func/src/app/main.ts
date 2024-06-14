import { app } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

import * as E from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";
import { getConfigFromEnvironment } from "./config";
import { HealthFunction } from "@/infra/azure/functions/health";

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity)
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

const credential = new DefaultAzureCredential();

const cosmosClient = new CosmosClient({
  endpoint: config.azure.cosmos.endpoint,
  aadCredentials: credential,
});

app.http("healthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: HealthFunction({ cosmosClient }),
});
