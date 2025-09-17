import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as appInsights from "applicationinsights";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { WhitelistedFiscalCodeRepository } from "@/whitelisted-fiscal-code";

import { IsFiscalCodeWhitelistedHandler } from "../is-fiscal-code-whitelisted";

describe("IsFiscalCodeWhitelistedHandler", () => {
  const whitelistedFiscalCodeRepositoryThatReturnsWhitelistedFiscalCode: WhitelistedFiscalCodeRepository =
    {
      checkIfFiscalCodeIsWhitelisted: () =>
        TE.right({
          whitelisted: true,
          whitelistedAt: new Date().toISOString(),
        }),
    };

  const whitelistedFiscalCodeRepositoryThatReturnsNonWhitelistedFiscalCode: WhitelistedFiscalCodeRepository =
    {
      checkIfFiscalCodeIsWhitelisted: () => TE.right({ whitelisted: false }),
    };

  const whitelistedFiscalCodeRepositoryThatFails: WhitelistedFiscalCodeRepository =
    {
      checkIfFiscalCodeIsWhitelisted: () => TE.left(new Error("generic error")),
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
      fiscalCode: "RSSMRA85M01H501Z",
    },
  };

  const reqWithInvalidFiscalCode = {
    ...H.request("https://wallet-provider.example.org"),
    method: "GET",
    path: {
      fiscalCode: "THIS_IS_AN_INVALID_FISCAL_CODE",
    },
  };

  it("should return a 200 HTTP response whit whitelisted = true", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      whitelistedFiscalCodeRepository:
        whitelistedFiscalCodeRepositoryThatReturnsWhitelistedFiscalCode,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          fiscalCode: "RSSMRA85M01H501Z",
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
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      whitelistedFiscalCodeRepository:
        whitelistedFiscalCodeRepositoryThatReturnsNonWhitelistedFiscalCode,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          fiscalCode: "RSSMRA85M01H501Z",
          whitelisted: false,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 422 HTTP response cause by an invalid fiscal code in the request", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      input: reqWithInvalidFiscalCode,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      whitelistedFiscalCodeRepository: whitelistedFiscalCodeRepositoryThatFails,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "Your request didn't validate",
          status: 422,
          title: "Validation Error",
          type: "/problem/validation-error",
          violations: expect.any(Array),
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 422,
      },
    });
  });

  it("should return a 500 HTTP response when getCosmosHealth and getPidIssuerHealth return an error", async () => {
    const handler = IsFiscalCodeWhitelistedHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      whitelistedFiscalCodeRepository: whitelistedFiscalCodeRepositoryThatFails,
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
