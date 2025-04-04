/* eslint-disable max-lines-per-function */
import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { GetCurrentWalletInstanceStatusHandler } from "../get-current-wallet-instance-status";

describe("GetCurrentWalletInstanceStatusHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.left(new Error("not implemented")),
    deleteAllByUserId: () => TE.left(new Error("not implemented")),
    getByUserId: () => TE.left(new Error("not implemented")),
    getLastByUserId: () =>
      TE.right(
        O.some({
          createdAt: new Date(),
          hardwareKey: {
            crv: "P-256",
            kty: "EC",
            x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
            y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
          },
          id: "123" as NonEmptyString,
          isRevoked: false,
          signCount: 0,
          userId: "AAA" as FiscalCode,
        }),
      ),
    getUserId: () => TE.left(new Error("not implemented")),
    getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
    insert: () => TE.left(new Error("not implemented")),
  };

  const req = {
    ...H.request("https://wallet-provider.example.org"),
    headers: {
      "fiscal-code": "GSPMTA98L25E625O",
    },
    method: "GET",
  };

  const telemetryClient: appInsights.TelemetryClient = {
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  it("should return a 200 HTTP response on success", async () => {
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: false,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 400 HTTP response when fiscal-code header is missing", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        fiscalcode: "GSPMTA98L25E625O",
      },
      method: "GET",
    };

    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 400,
      }),
    });
  });

  it("should return a 422 HTTP response when fiscal-code header is not a valid fiscal code", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        "fiscal-code": "foo",
      },
      method: "GET",
    };

    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 422,
      }),
    });
  });

  it("should return a 404 HTTP response when no wallet instances is found", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.right(O.none),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 404,
      }),
    });
  });

  it("should return a 500 HTTP response on getLastByUserId error", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        deleteAllByUserId: () => TE.left(new Error("not implemented")),
        getByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("failed on getLastByUserId!")),
        getUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository:
        walletInstanceRepositoryThatFailsOnGetLastByUserId,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      }),
    });
  });

  it("should return a 503 HTTP response when getLastByUserId returns ServiceUnavailableError", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        deleteAllByUserId: () => TE.left(new Error("not implemented")),
        getByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new ServiceUnavailableError("foo")),
        getUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository:
        walletInstanceRepositoryThatFailsOnGetLastByUserId,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 503,
      }),
    });
  });
});
