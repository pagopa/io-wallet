/* eslint-disable max-lines-per-function */
import { IpzsApiClient } from "@/infra/ipzs-services/client";
import { PdvTokenizerHealthCheck } from "@/infra/pdv-tokenizer/health-check";
import { TrialSystemHealthCheck } from "@/infra/trial-system/health-check";
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

  const pdvTokenizerClient: PdvTokenizerHealthCheck = {
    healthCheck: () => TE.right(true),
  };

  const pdvTokenizerClientThatFails: PdvTokenizerHealthCheck = {
    healthCheck: () => TE.left(new Error("pdv-tokenizer-error")),
  };

  const trialSystemClient: TrialSystemHealthCheck = {
    featureFlag: "true",
    healthCheck: () => TE.right(true),
  };

  const trialSystemClientThatFails: TrialSystemHealthCheck = {
    featureFlag: "true",
    healthCheck: () => TE.left(new Error("trial-system-error")),
  };

  const ipzsServicesClient: IpzsApiClient = {
    healthCheck: () => TE.right(true),
    revokeAllCredentials: () => TE.left(new Error("not implemented!")),
  };

  const ipzsServicesClientThatFails: IpzsApiClient = {
    healthCheck: () => TE.left(new Error("ipzs-error")),
    revokeAllCredentials: () => TE.left(new Error("not implemented!")),
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
      ipzsServicesClient,
      logger,
      pdvTokenizerClient,
      trialSystemClient,
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
      ipzsServicesClient,
      logger,
      pdvTokenizerClient,
      trialSystemClient,
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

  it("should return a 500 HTTP response when getPdvTokenizerHealth returns an error", async () => {
    const handler = HealthHandler({
      cosmosClient,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      ipzsServicesClient,
      logger,
      pdvTokenizerClient: pdvTokenizerClientThatFails,
      trialSystemClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "The function is not healthy. Error: pdv-tokenizer-error",
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

  it("should return a 500 HTTP response when getCosmosHealth and getPdvTokenizerHealth return an error", async () => {
    const handler = HealthHandler({
      cosmosClient: cosmosClientThatFails,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      ipzsServicesClient,
      logger,
      pdvTokenizerClient: pdvTokenizerClientThatFails,
      trialSystemClient,
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
          detail: expect.stringContaining("pdv-tokenizer-error"),
        }),
      );
    }
  });

  it("should return a 500 HTTP response when getTrialSystemHealth returns an error", async () => {
    const handler = HealthHandler({
      cosmosClient,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      ipzsServicesClient,
      logger,
      pdvTokenizerClient,
      trialSystemClient: trialSystemClientThatFails,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "The function is not healthy. Error: trial-system-error",
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

  it("should return a 500 HTTP response when getIpzsHealth returns an error", async () => {
    const handler = HealthHandler({
      cosmosClient,
      input: H.request("https://wallet-provider.example.org"),
      inputDecoder: H.HttpRequest,
      ipzsServicesClient: ipzsServicesClientThatFails,
      logger,
      pdvTokenizerClient,
      trialSystemClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "The function is not healthy. Error: ipzs-error",
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
