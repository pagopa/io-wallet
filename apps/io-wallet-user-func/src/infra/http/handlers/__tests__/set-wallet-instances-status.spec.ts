/* eslint-disable max-lines-per-function */
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { WalletInstanceRepository } from "@/wallet-instance";

import { SetWalletInstancesStatusHandler } from "../set-wallet-instances-status";

describe("SetWalletInstancesStatusHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const validWalletInstance = {
    createdAt: new Date(),
    deviceDetails: {
      attestationSecurityLevel: 2,
      attestationVersion: 4,
      keymasterSecurityLevel: 2,
      keymasterVersion: 4,
      osPatchLevel: 202410,
      osVersion: 14,
      platform: "android" as const,
      x509Chain: [
        "-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAKL0UG+mRKSzMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\nBAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMSEwHwYDVQQKDBhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjBF\nMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEhMB8GA1UECgwYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\nCgKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onL\nRnrq0/IzKP6aoIIp0FPE0oL0KqRgXNP7CPfS45pz5pnrWPpnK6WEkDaWBLF8axd7\nPE0gfLVJB7F/Mqw8RDBxkXXjE/CuRaU1WP6Y5vvKvXcVY8YIc7wKkPPnKCL8pGqX\nYaFQ6LALSYSLeFcfCOJLs3a6b3JHRGLxPG8uP5V4B6EWWHPvlNlL8iFPBLwL7MhK\nmREJFN4vCG7BEE6vLRPvEU4BVJvqXPGZ7sSL2mLqLvCTH6rJ3cLqQCCj9TShfNp8\nqGIGiPQTcR5hg7qGCqMNCB7qyROhcQIDAQABo1AwTjAdBgNVHQ4EFgQUXH/C9TcY\nu7XFHRFj3GQqNkBfKD0wHwYDVR0jBBgwFoAUXH/C9TcYu7XFHRFj3GQqNkBfKD0w\nDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAMmPv5f1MqEauS7cJb2Kq\nPDFTdWHF8mCPpqFP5KBxKPbLB8CmhDKI7EPCL7f+x6fQX5PV9VqTFJ6z5RGH7bG9\nyWG8xHJZGVOBqmC2+Lcy+MYmvGN7RdYF5hYQF+1cEL7LmK8fP9N0VF/3JgGLqTtK\noXbHDTaLvFCTBdqBKFNl9qwPKN8JV3pWHQKLw/f6HvkpJLjBhAqQ5N8o7YKQQMOP\ny+vKzLVG3xlmLFKV2DhJHWqUJaGp9eW+vqQqONTnWpwPFvGvYzxfPUkQYVNQHZG7\nZQ8CJmUXGPPP3GYLCh5mNqGKLqQCVqFgWCPQzKCKPqEK8rVA4YJbIFMxNNTcGT5V\nTA==\n-----END CERTIFICATE-----\n",
      ],
    },
    hardwareKey: {
      crv: "P-256",
      kty: "EC" as const,
      x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
      y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
    },
    id: "123" as NonEmptyString,
    isRevoked: false as const,
    signCount: 0,
    userId: "AAACCC91D55H501P" as FiscalCode,
  };

  const request = {
    ...H.request("https://wallet-provider.example.org/"),
    body: {
      fiscal_code: "GSPMTA98L25E625O",
      reason: "USER_DECEASED",
      status: "REVOKED",
    },
    method: "POST",
  };

  it("should return a 204 HTTP response on success", async () => {
    let batchPatchCalled = false;
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => {
        batchPatchCalled = true;
        return TE.right(undefined);
      },
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.right(O.some([validWalletInstance])),
      getValidByUserIdExcludingOne: () =>
        TE.right(O.some([validWalletInstance])),
      insert: () => TE.left(new Error("not implemented")),
    };

    const handler = SetWalletInstancesStatusHandler({
      input: request,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 204,
      }),
    });
    expect(batchPatchCalled).toBe(true);
  });

  it("should return a 204 HTTP response when there are no valid wallet instances", async () => {
    let batchPatchCalled = false;
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => {
        batchPatchCalled = true;
        return TE.right(undefined);
      },
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.right(O.none),
      getValidByUserIdExcludingOne: () => TE.right(O.none),
      insert: () => TE.left(new Error("not implemented")),
    };

    const handler = SetWalletInstancesStatusHandler({
      input: request,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 204,
      }),
    });
    expect(batchPatchCalled).toBe(false);
  });

  it("should return a 422 HTTP response on invalid status", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => TE.right(undefined),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.right(O.none),
      getValidByUserIdExcludingOne: () => TE.right(O.none),
      insert: () => TE.left(new Error("not implemented")),
    };

    const handler = SetWalletInstancesStatusHandler({
      input: {
        ...request,
        body: {
          ...request.body,
          status: "foo",
        },
      },
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

  it("should return a 422 HTTP response on invalid reason", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => TE.right(undefined),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.right(O.none),
      getValidByUserIdExcludingOne: () => TE.right(O.none),
      insert: () => TE.left(new Error("not implemented")),
    };

    const handler = SetWalletInstancesStatusHandler({
      input: {
        ...request,
        body: {
          ...request.body,
          reason: "NEW_WALLET_INSTANCE_CREATED",
        },
      },
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

  it("should return a 500 HTTP response when getValidByUserId returns Error", async () => {
    const walletInstanceRepositoryThatFails: WalletInstanceRepository = {
      batchPatch: () => TE.right(undefined),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.left(new Error("foo")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = SetWalletInstancesStatusHandler({
      input: request,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 500 HTTP response when batchPatch returns Error", async () => {
    const walletInstanceRepositoryThatFails: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("foo")),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.right(O.some([validWalletInstance])),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = SetWalletInstancesStatusHandler({
      input: request,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 503 HTTP response when getValidByUserId returns ServiceUnavailableError", async () => {
    const walletInstanceRepositoryThatFails: WalletInstanceRepository = {
      batchPatch: () => TE.right(undefined),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.left(new ServiceUnavailableError("foo")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = SetWalletInstancesStatusHandler({
      input: request,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository: walletInstanceRepositoryThatFails,
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

  it("should return a 503 HTTP response when batchPatch returns ServiceUnavailableError", async () => {
    const walletInstanceRepositoryThatFails: WalletInstanceRepository = {
      batchPatch: () => TE.left(new ServiceUnavailableError("foo")),
      getByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getValidByUserId: () => TE.right(O.some([validWalletInstance])),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = SetWalletInstancesStatusHandler({
      input: request,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository: walletInstanceRepositoryThatFails,
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
