import { it, expect, describe } from "vitest";

import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import { CosmosClient, DatabaseAccount, ResourceResponse } from "@azure/cosmos";

import { HealthHandler } from "../health";
import { PdvTokenizerHealthCheck } from "@/infra/pdv-tokenizer/health-check";

describe("HealthHandler", () => {
  const cosmosClient = {
    getDatabaseAccount: () =>
      Promise.resolve({} as ResourceResponse<DatabaseAccount>),
  } as CosmosClient;

  const cosmosClientThatFails = {
    getDatabaseAccount: () => Promise.reject(new Error("foo")),
  } as CosmosClient;

  const pdvTokenizerClient = {
    healthCheck: () => TE.right(true),
  } as PdvTokenizerHealthCheck;

  const pdvTokenizerClientThatFails = {
    healthCheck: () => TE.left(new Error("pdv-tokenizer-error")),
  } as PdvTokenizerHealthCheck;

  it("should return a 200 HTTP response on success", async () => {
    const handler = HealthHandler({
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      cosmosClient,
      pdvTokenizerClient,
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
      pdvTokenizerClient,
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
          detail: "The function is not healthy. Error: cosmos-db-error",
        },
      },
    });
  });

  it("should return a 500 HTTP response when getPdvTokenizerHealth returns an error", async () => {
    const handler = HealthHandler({
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      cosmosClient,
      pdvTokenizerClient: pdvTokenizerClientThatFails,
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
          detail: "The function is not healthy. Error: pdv-tokenizer-error",
        },
      },
    });
  });

  it("should return a 500 HTTP response when getCosmosHealth and getPdvTokenizerHealth return an error", async () => {
    const handler = HealthHandler({
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      cosmosClient: cosmosClientThatFails,
      pdvTokenizerClient: pdvTokenizerClientThatFails,
    });

    const result = await handler();

    expect.assertions(3);
    expect(result).toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 500,
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
      }),
    });
    if (E.isRight(result)) {
      const body = result.right.body;
      expect(body).toEqual({
        title: "Internal Server Error",
        status: 500,
        detail: expect.stringContaining("cosmos-db-error"),
      });
      expect(body).toEqual(
        expect.objectContaining({
          detail: expect.stringContaining("pdv-tokenizer-error"),
        })
      );
    }
  });
});
