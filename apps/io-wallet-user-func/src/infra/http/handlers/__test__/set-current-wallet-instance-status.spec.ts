import { CredentialRepository } from "@/credential";
import { WalletInstanceRepository } from "@/wallet-instance";
import { QueueClient, QueueSendMessageResponse } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { SetCurrentWalletInstanceStatusHandler } from "../set-current-wallet-instance-status";

// eslint-disable-next-line max-lines-per-function
describe("SetCurrentWalletInstanceStatusHandler", () => {
  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    deleteAllByUserId: () => TE.left(new Error("not implemented")),
    get: () => TE.left(new Error("not implemented")),
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
    getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
    insert: () => TE.left(new Error("not implemented")),
  };

  const whitelistFiscalCodes = ["TESTCF00001, TESTCF00002, TESTCF00003"];

  const pidIssuerClient: CredentialRepository = {
    revokeAllCredentials: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const telemetryClient: appInsights.TelemetryClient = {
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  const req = {
    ...H.request("https://wallet-provider.example.org/"),
    body: {
      fiscal_code: "AAACCC94D55H501P",
      status: "REVOKED",
    },
    method: "PUT",
  };

  const queueRevocationClient: QueueClient = {
    sendMessage: () =>
      Promise.resolve({
        errorCode: undefined,
        messageId: "messageId",
      } as QueueSendMessageResponse),
  } as unknown as QueueClient;

  it("should return a 204 HTTP response on success", async () => {
    const handler = SetCurrentWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueRevocationClient,
      telemetryClient,
      walletInstanceRepository,
      whitelistFiscalCodes,
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
      ...H.request("https://wallet-provider.example.org/"),
      body: {
        foo: "AAACCC94D55H501P",
        status: "REVOKED",
      },
      method: "PUT",
    };
    const handler = SetCurrentWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueRevocationClient,
      telemetryClient,
      walletInstanceRepository,
      whitelistFiscalCodes,
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

  it("should return a 500 HTTP response on revokeAllCredentials error", async () => {
    const pidIssuerClientThatFailsOnRevoke: CredentialRepository = {
      revokeAllCredentials: () =>
        TE.left(new Error("failed on revokeAllCredentials!")),
    };
    const handler = SetCurrentWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClientThatFailsOnRevoke,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueRevocationClient,
      telemetryClient,
      walletInstanceRepository,
      whitelistFiscalCodes,
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

  it("should return a 500 HTTP response on batchPatch error", async () => {
    const walletInstanceRepositoryThatFailsOnBatchPatch: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("failed on batchPatch!")),
        deleteAllByUserId: () => TE.left(new Error("not implemented")),
        get: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = SetCurrentWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueRevocationClient,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnBatchPatch,
      whitelistFiscalCodes,
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

  it("should return a 503 HTTP response on cosmos db timeout error", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("failed on batchPatch!")),
        deleteAllByUserId: () => TE.left(new Error("not implemented")),
        get: () => TE.left(new Error("not implemented")),
        getLastByUserId: () =>
          TE.left(new ServiceUnavailableError("failed on getLastByUserId!")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = SetCurrentWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      queueRevocationClient,
      telemetryClient,
      walletInstanceRepository:
        walletInstanceRepositoryThatFailsOnGetLastByUserId,
      whitelistFiscalCodes,
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
