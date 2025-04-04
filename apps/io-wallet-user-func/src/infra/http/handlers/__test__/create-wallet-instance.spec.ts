/* eslint-disable max-lines-per-function */
import { AttestationService } from "@/attestation-service";
import { iOSMockData } from "@/infra/mobile-attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";
import { QueueClient, QueueSendMessageResponse } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { CreateWalletInstanceHandler } from "../create-wallet-instance";

const mockFiscalCode = "AAACCC94E17H501P" as FiscalCode;

describe("CreateWalletInstanceHandler", () => {
  const { attestation, challenge, keyId } = iOSMockData;

  const walletInstanceRequest = {
    challenge,
    fiscal_code: mockFiscalCode,
    hardware_key_tag: keyId,
    key_attestation: attestation,
  };

  const nonceRepository: NonceRepository = {
    delete: () => TE.right(void 0),
    insert: () => TE.left(new Error("not implemented")),
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    deleteAllByUserId: () => TE.left(new Error("not implemented")),
    getByUserId: () => TE.left(new Error("not implemented")),
    getLastByUserId: () => TE.left(new Error("not implemented")),
    getUserId: () => TE.left(new Error("not implemented")),
    getValidByUserIdExcludingOne: () => TE.right(O.some([])),
    insert: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const mockAttestationService: AttestationService = {
    getHardwarePublicTestKey: () => TE.left(new Error("not implemented")),
    validateAssertion: () => TE.right(undefined),
    validateAttestation: () =>
      TE.right({
        deviceDetails: { platform: "ios" },
        hardwareKey: {
          crv: "P-256",
          kid: "ea693e3c-e8f6-436c-ac78-afdf9956eecb",
          kty: "EC",
          x: "01m0xf5ujQ5g22FvZ2zbFrvyLx9bgN2AiLVFtca2BUE",
          y: "7ZIKVr_WCQgyLOpTysVUrBKJz1LzjNlK3DD4KdOGHjo",
        },
      }),
  };

  const queueClient: QueueClient = {
    sendMessage: () =>
      Promise.resolve({
        errorCode: undefined,
        messageId: "messageId",
      } as QueueSendMessageResponse),
  } as unknown as QueueClient;

  const telemetryClient: appInsights.TelemetryClient = {
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  it("should return a 204 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationService: mockAttestationService,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
        foo: "foo",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationService: mockAttestationService,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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

  it("should return a 500 HTTP response on validateChallenge error", async () => {
    const nonceRepositoryThatFailsOnDelete: NonceRepository = {
      delete: () => TE.left(new Error("failed on delete!")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationService: mockAttestationService,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository: nonceRepositoryThatFailsOnDelete,
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
        statusCode: 500,
      }),
    });
  });

  it("should return a 500 HTTP response on insertWalletInstance error", async () => {
    const walletInstanceRepositoryThatFailsOnInsert: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        deleteAllByUserId: () => TE.left(new Error("not implemented")),
        getByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        getUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("failed on insert!")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationService: mockAttestationService,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      queueClient,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnInsert,
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

  it("should return a 500 HTTP response on getValidByUserIdExcludingOne error", async () => {
    const walletInstanceRepositoryThatFails: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () =>
        TE.left(new Error("failed on getValidByUserIdExcludingOne!")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationService: mockAttestationService,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      queueClient,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFails,
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
        getByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        getUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationService: mockAttestationService,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
