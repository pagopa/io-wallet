import { it, expect, describe } from "vitest";

import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";

import { CosmosClient, DatabaseAccount, ResourceResponse } from "@azure/cosmos";

import { HealthHandler } from "../health";

describe("HealthHandler", () => {
  const cosmosClient = {
    getDatabaseAccount: () =>
      Promise.resolve({} as ResourceResponse<DatabaseAccount>),
  } as CosmosClient;

  const cosmosClientThatFails = {
    getDatabaseAccount: () => Promise.reject(new Error("foo")),
  } as CosmosClient;

  it("should return a 200 HTTP response on success", async () => {
    const handler = HealthHandler({
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      cosmosClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        statusCode: 200,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: {
          message: "it works!",
        },
      },
    });
  });

  it("should return a 500 HTTP response when getCosmosHealth returns an error", async () => {
    const handler = HealthHandler({
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      cosmosClient: cosmosClientThatFails,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        statusCode: 500,
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        body: {
          title: "Internal Server Error",
          status: 500,
          detail: "The function is not healthy. cosmos-db-error", // su user-func è "The function is not healthy. Error: cosmos-db-error"
        },
      },
    });
  });
});
