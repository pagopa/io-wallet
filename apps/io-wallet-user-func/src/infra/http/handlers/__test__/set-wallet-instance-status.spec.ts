import { WalletInstanceRepository } from "@/wallet-instance";
import { QueueClient, QueueSendMessageResponse } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as appInsights from "applicationinsights";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { SetWalletInstanceStatusHandler } from "../set-wallet-instance-status";

describe("SetWalletInstanceStatusHandler", () => {
  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    get: () => TE.left(new Error("not implemented")),
    getLastByUserId: () => TE.left(new Error("not implemented")),
    getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
    insert: () => TE.left(new Error("not implemented")),
  };

  const queueClient: QueueClient = {
    sendMessage: () =>
      Promise.resolve({
        errorCode: undefined,
        messageId: "messageId",
      } as QueueSendMessageResponse),
  } as unknown as QueueClient;

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const req = {
    ...H.request("https://wallet-provider.example.org/"),
    body: {
      fiscal_code: "GSPMTA98L25E625O",
      status: "REVOKED",
    },
    method: "PUT",
    path: {
      id: "foo",
    },
  };

  const telemetryClient: appInsights.TelemetryClient = {
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  it("should return a 204 HTTP response on success", async () => {
    const handler = SetWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueClient,
      telemetryClient,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 204,
      }),
    });
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        fiscal_code: "GSPMTA98L25E625O",
        status: "revoked",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueClient,
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

  it("should return a 500 HTTP response on batchPatch error", async () => {
    const walletInstanceRepositoryThatFailsOnBatchPatch: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("failed on batchPatch!")),
        get: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = SetWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueClient,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnBatchPatch,
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
