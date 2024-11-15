import { PidIssuerHealthCheck } from "@/infra/pid-issuer/health-check";
import { CosmosClient, DatabaseAccount, ResourceResponse } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { HealthHandler } from "../health";

describe("HealthHandler", () => {
  const cosmosClient = {
    getDatabaseAccount: () =>
      Promise.resolve({} as ResourceResponse<DatabaseAccount>),
  } as CosmosClient;

  const cosmosClientThatFails = {
    getDatabaseAccount: () => Promise.reject(new Error("foo")),
  } as CosmosClient;

  const pidIssuerClient: PidIssuerHealthCheck = {
    healthCheck: () => TE.right(true),
  };

  const pidIssuerClientThatFails: PidIssuerHealthCheck = {
    healthCheck: () => TE.left(new Error("pid-issuer-error")),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  it("should return a 200 HTTP response on success", async () => {
    const handler = HealthHandler({
      cosmosClient,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger,
      pidIssuerClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          message: "it works!",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 500 HTTP response when getCosmosHealth returns an error", async () => {
    const handler = HealthHandler({
      cosmosClient: cosmosClientThatFails,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger,
      pidIssuerClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "The function is not healthy. Error: cosmos-db-error",
          status: 500,
          title: "Internal Server Error",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      },
    });
  });

  it("should return a 500 HTTP response when getCosmosHealth and getPidIssuerHealth return an error", async () => {
    const handler = HealthHandler({
      cosmosClient: cosmosClientThatFails,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger,
      pidIssuerClient: pidIssuerClientThatFails,
    });

    const result = await handler();

    expect.assertions(3);
    expect(result).toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      }),
    });
    if (E.isRight(result)) {
      const body = result.right.body;
      expect(body).toEqual({
        detail: expect.stringContaining("cosmos-db-error"),
        status: 500,
        title: "Internal Server Error",
      });
      expect(body).toEqual(
        expect.objectContaining({
          detail: expect.stringContaining("pid-issuer-error"),
        }),
      );
    }
  });

  it("should return a 500 HTTP response when getPidIssuerHealth returns an error", async () => {
    const handler = HealthHandler({
      cosmosClient,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger,
      pidIssuerClient: pidIssuerClientThatFails,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "The function is not healthy. Error: pid-issuer-error",
          status: 500,
          title: "Internal Server Error",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      },
    });
  });
});
