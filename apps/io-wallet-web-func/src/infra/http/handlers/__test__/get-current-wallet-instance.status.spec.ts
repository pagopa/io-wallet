import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { GetCurrentWalletInstanceStatusHandler } from "../get-current-wallet-instance-status";

describe("GetCurrentWalletInstanceStatusHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    getAllByUserId: () => TE.left(new Error("not implemented")),
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
          userId: "123" as NonEmptyString,
        }),
      ),
  };

  it("should return a 200 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "authorization",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 400 HTTP response when authorization header is missing", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 404 HTTP response when no wallet instances is found", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      getAllByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.right(O.none),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "authorization",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 422 HTTP response when authorization header is an empty string", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 500 HTTP response on getLastByUserId error", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("failed on getLastByUserId!")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "authorization",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
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
});
