import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import * as E from "fp-ts/Either";
import { identity, pipe } from "fp-ts/function";

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
  aadCredentials: credential,
  endpoint: config.azure.cosmos.endpoint,
});

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthFunction({ cosmosClient }),
  methods: ["GET"],
  route: "health",
});
