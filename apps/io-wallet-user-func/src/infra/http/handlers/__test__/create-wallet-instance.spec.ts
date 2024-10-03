/* eslint-disable max-lines-per-function */
import {
  ANDROID_CRL_URL,
  ANDROID_PLAY_INTEGRITY_URL,
  APPLE_APP_ATTESTATION_ROOT_CA,
  GOOGLE_PUBLIC_KEY,
  decodeBase64String,
} from "@/app/config";
import { iOSMockData } from "@/infra/attestation-service/ios/__test__/config";
import { LoadTestClient } from "@/load-test";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { User } from "io-wallet-common/user";
import { describe, expect, it } from "vitest";

import { CreateWalletInstanceHandler } from "../create-wallet-instance";

describe("CreateWalletInstanceHandler", () => {
  const { attestation, challenge, keyId } = iOSMockData;

  const walletInstanceRequest = {
    challenge,
    hardware_key_tag: keyId,
    key_attestation: attestation,
  };

  const nonceRepository: NonceRepository = {
    delete: () => TE.right(void 0),
    insert: () => TE.left(new Error("not implemented")),
  };

  const loadTestClient: LoadTestClient = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isTestUser: function (user: User): boolean {
      return false;
    },
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    get: () => TE.left(new Error("not implemented")),
    getAllByUserId: () => TE.right(O.some([])),
    getLastByUserId: () => TE.left(new Error("not implemented")),
    insert: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const attestationServiceConfiguration = {
    allowDevelopmentEnvironment: true,
    androidBundleIdentifiers: [
      "org.reactjs.native.example.IoReactNativeIntegrityExample",
    ],
    androidCrlUrl: decodeBase64String(ANDROID_CRL_URL),
    androidPlayIntegrityUrl: decodeBase64String(ANDROID_PLAY_INTEGRITY_URL),
    androidPlayStoreCertificateHash: "",
    appleRootCertificate: decodeBase64String(APPLE_APP_ATTESTATION_ROOT_CA),
    googleAppCredentialsEncoded: "",
    googlePublicKey: decodeBase64String(GOOGLE_PUBLIC_KEY),
    httpRequestTimeout: 0,
    iOsTeamIdentifier: "M2X5YQ4BJ7",
    iosBundleIdentifiers: [
      "org.reactjs.native.example.IoReactNativeIntegrityExample",
    ],
    skipSignatureValidation: false,
  };

  it("should return a 204 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 204,
      }),
    });
  });

  it("should return a 400 HTTP response when x-iowallet-user-id header is missing", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
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

  it("should return a 422 HTTP response when x-iowallet-user-id header is an empty string", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      headers: {
        "x-iowallet-user-id": "",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
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

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        foo: "foo",
      },
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
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
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository: nonceRepositoryThatFailsOnDelete,
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
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("failed on insert!")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
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

  it("should return a 500 HTTP response on getAllByUserId error", async () => {
    const walletInstanceRepositoryThatFailsOnGetAllByUserId: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        get: () => TE.left(new Error("not implemented")),
        getAllByUserId: () => TE.left(new Error("failed on getAllByUserId!")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
      walletInstanceRepository:
        walletInstanceRepositoryThatFailsOnGetAllByUserId,
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
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: walletInstanceRequest,
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceHandler({
      attestationServiceConfiguration,
      input: req,
      inputDecoder: H.HttpRequest,
      loadTestClient,
      logger,
      nonceRepository,
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
