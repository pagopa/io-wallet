import { FiscalCodeRepository } from "@/fiscal-code";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as appInsights from "applicationinsights";
import * as TE from "fp-ts/TaskEither";
import { EntityNotFoundError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { IsFiscalCodeWhitelistedHandler } from "../is-fiscal-code-whitelisted";

describe("IsFiscalCodeWhitelistedHandler", () => {
  const fiscalCodeRepositoryThatReturnsTrue: FiscalCodeRepository = {
    isFiscalCodeWhitelisted: () => TE.right(true),
  };

  const fiscalCodeRepositoryThatReturnsFalse: FiscalCodeRepository = {
    isFiscalCodeWhitelisted: () =>
      TE.left(new EntityNotFoundError("Fiscal code not found")),
  };

  const fiscalCodeRepositoryThatFails: FiscalCodeRepository = {
    isFiscalCodeWhitelisted: () => TE.left(new Error("generic error")),
  };

  const telemetryClient: appInsights.TelemetryClient = {
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const req = {
    ...H.request("https://wallet-provider.example.org"),
    method: "GET",
    path: {
      fiscalCode: "TEST_FISCAL_CODE",
    },
  };

  it("should return a 200 HTTP response on success", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      fiscalCodeRepository: fiscalCodeRepositoryThatReturnsTrue,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: void 0,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 404 HTTP response when fiscalCodeRepository.isFiscalCodeWhitelisted() returns false", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      fiscalCodeRepository: fiscalCodeRepositoryThatReturnsFalse,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "Fiscal code not found",
          status: 404,
          title: "Not Found",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 404,
      },
    });
  });

  it("should return a 500 HTTP response when getCosmosHealth and getPidIssuerHealth return an error", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      fiscalCodeRepository: fiscalCodeRepositoryThatFails,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "Error",
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
