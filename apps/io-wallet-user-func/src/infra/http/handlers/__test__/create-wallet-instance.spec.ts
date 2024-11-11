/* eslint-disable max-lines-per-function */
import {
  ANDROID_CRL_URL,
  ANDROID_PLAY_INTEGRITY_URL,
  APPLE_APP_ATTESTATION_ROOT_CA,
  GOOGLE_PUBLIC_KEY,
  HARDWARE_PUBLIC_TEST_KEY,
  decodeBase64String,
} from "@/app/config";
import { iOSMockData } from "@/infra/attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";
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
    get: () => TE.left(new Error("not implemented")),
    getLastByUserId: () => TE.left(new Error("not implemented")),
    getValidByUserIdExcludingOne: () => TE.right(O.some([])),
    insert: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const attestationServiceConfiguration = {
    allowedDeveloperUsers: [mockFiscalCode],
    androidBundleIdentifiers: [
      "org.reactjs.native.example.IoReactNativeIntegrityExample",
    ],
    androidCrlUrl: decodeBase64String(ANDROID_CRL_URL),
    androidPlayIntegrityUrl: decodeBase64String(ANDROID_PLAY_INTEGRITY_URL),
    androidPlayStoreCertificateHash: "",
    appleRootCertificate: decodeBase64String(APPLE_APP_ATTESTATION_ROOT_CA),
    googleAppCredentialsEncoded: "",
    googlePublicKey: decodeBase64String(GOOGLE_PUBLIC_KEY),
    hardwarePublicTestKey: decodeBase64String(HARDWARE_PUBLIC_TEST_KEY),
    httpRequestTimeout: 0,
    iOsTeamIdentifier: "M2X5YQ4BJ7",
    iosBundleIdentifiers: [
      "org.reactjs.native.example.IoReactNativeIntegrityExample",
    ],
    skipSignatureValidation: false,
  };

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
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository: nonceRepositoryThatFailsOnDelete,
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
        get: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
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
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      get: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
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
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
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
