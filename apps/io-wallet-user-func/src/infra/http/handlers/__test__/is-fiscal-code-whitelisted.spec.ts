import { FiscalCodeRepository } from "@/fiscal-code";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as appInsights from "applicationinsights";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { IsFiscalCodeWhitelistedHandler } from "../is-fiscal-code-whitelisted";

describe("IsFiscalCodeWhitelistedHandler", () => {
  const fiscalCodeRepositoryThatReturnsWhitelistedFiscalCode: FiscalCodeRepository =
    {
      getFiscalCodeWhitelisted: () =>
        TE.right({
          whitelisted: true,
          whitelistedAt: new Date().toISOString(),
        }),
    };

  const fiscalCodeRepositoryThatReturnsNonWhitelistedFiscalCode: FiscalCodeRepository =
    {
      getFiscalCodeWhitelisted: () => TE.right({ whitelisted: false }),
    };

  const fiscalCodeRepositoryThatFails: FiscalCodeRepository = {
    getFiscalCodeWhitelisted: () => TE.left(new Error("generic error")),
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

  it("should return a 200 HTTP response whit whitelisted = true", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      fiscalCodeRepository:
        fiscalCodeRepositoryThatReturnsWhitelistedFiscalCode,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          fiscalCode: "TEST_FISCAL_CODE",
          whitelisted: true,
          whitelistedAt: expect.any(String),
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 200 HTTP response when with whitelisted = false", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      fiscalCodeRepository:
        fiscalCodeRepositoryThatReturnsNonWhitelistedFiscalCode,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          fiscalCode: "TEST_FISCAL_CODE",
          whitelisted: false,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
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
