/* eslint-disable max-lines-per-function */
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WalletInstanceRepository } from "@/wallet-instance";

import { GetWalletInstanceStatusHandler } from "../get-wallet-instance-status";

describe("GetWalletInstanceStatusHandler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const getAttestationStatusList = () =>
    TE.right({
      entries: {
        a2f4506fa644a4b3: {
          reason: "KEY_COMPROMISE",
          status: "REVOKED",
        },
      },
    });

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    deleteAllByUserId: () => TE.left(new Error("not implemented")),
    getByUserId: () =>
      TE.right(
        O.some({
          createdAt: new Date(),
          deviceDetails: {
            attestationSecurityLevel: 2,
            attestationVersion: 4,
            keymasterSecurityLevel: 2,
            keymasterVersion: 4,
            osPatchLevel: 202410,
            osVersion: 14,
            platform: "android",
            x509Chain: [
              "-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAKL0UG+mRKSzMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\nBAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMSEwHwYDVQQKDBhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjBF\nMQswCQYDVQQGEwJVUzETMBEGA1UECAwKQ2FsaWZvcm5pYTEhMB8GA1UECgwYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\nCgKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onL\nRnrq0/IzKP6aoIIp0FPE0oL0KqRgXNP7CPfS45pz5pnrWPpnK6WEkDaWBLF8axd7\nPE0gfLVJB7F/Mqw8RDBxkXXjE/CuRaU1WP6Y5vvKvXcVY8YIc7wKkPPnKCL8pGqX\nYaFQ6LALSYSLeFcfCOJLs3a6b3JHRGLxPG8uP5V4B6EWWHPvlNlL8iFPBLwL7MhK\nmREJFN4vCG7BEE6vLRPvEU4BVJvqXPGZ7sSL2mLqLvCTH6rJ3cLqQCCj9TShfNp8\nqGIGiPQTcR5hg7qGCqMNCB7qyROhcQIDAQABo1AwTjAdBgNVHQ4EFgQUXH/C9TcY\nu7XFHRFj3GQqNkBfKD0wHwYDVR0jBBgwFoAUXH/C9TcYu7XFHRFj3GQqNkBfKD0w\nDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAMmPv5f1MqEauS7cJb2Kq\nPDFTdWHF8mCPpqFP5KBxKPbLB8CmhDKI7EPCL7f+x6fQX5PV9VqTFJ6z5RGH7bG9\nyWG8xHJZGVOBqmC2+Lcy+MYmvGN7RdYF5hYQF+1cEL7LmK8fP9N0VF/3JgGLqTtK\noXbHDTaLvFCTBdqBKFNl9qwPKN8JV3pWHQKLw/f6HvkpJLjBhAqQ5N8o7YKQQMOP\ny+vKzLVG3xlmLFKV2DhJHWqUJaGp9eW+vqQqONTnWpwPFvGvYzxfPUkQYVNQHZG7\nZQ8CJmUXGPPP3GYLCh5mNqGKLqQCVqFgWCPQzKCKPqEK8rVA4YJbIFMxNNTcGT5V\nTA==\n-----END CERTIFICATE-----\n",
            ],
          },
          hardwareKey: {
            crv: "P-256",
            kty: "EC",
            x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
            y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
          },
          id: "123" as NonEmptyString,
          isRevoked: false,
          signCount: 0,
          userId: "AAACCC91D55H501P" as FiscalCode,
        }),
      ),
    getLastByUserId: () => TE.left(new Error("not implemented")),
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
    path: {
      id: "foo",
    },
  };

  const telemetryClient: appInsights.TelemetryClient = {
    trackEvent: () => void 0,
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  it("should return a 200 HTTP response and not revoked wallet instance on success", async () => {
    const getAttestationStatusList = () =>
      TE.right({
        entries: {
          aaa: {
            reason: "KEY_COMPROMISE",
            status: "REVOKED",
          },
        },
      });

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
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

  it("should return a 200 HTTP response and revoked wallet instance with revocationReason on success", async () => {
    const walletInstanceRepositoryRevokedWI = {
      batchPatch: () => TE.right(undefined),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () =>
        TE.right(
          O.some({
            createdAt: new Date(),
            hardwareKey: {
              crv: "P-256",
              kty: "EC" as const,
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true as const,
            revocationReason: "CERTIFICATE_REVOKED_BY_ISSUER" as const,
            revokedAt: new Date(),
            signCount: 0,
            userId: "AAA" as FiscalCode,
          }),
        ),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryRevokedWI,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: true,
          revocation_reason: "CERTIFICATE_REVOKED_BY_ISSUER",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 200 HTTP response and revoked wallet instance with no revocationReason on success", async () => {
    const walletInstanceRepositoryRevokedWI = {
      batchPatch: () => TE.right(undefined),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () =>
        TE.right(
          O.some({
            createdAt: new Date(),
            hardwareKey: {
              crv: "P-256",
              kty: "EC" as const,
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true as const,
            revokedAt: new Date(),
            signCount: 0,
            userId: "AAA" as FiscalCode,
          }),
        ),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryRevokedWI,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: true,
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
      path: {
        id: "foo",
      },
    };

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
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

  it("should return a 404 HTTP response when no wallet instances is found", async () => {
    const walletInstanceRepositoryNoWIFound = {
      batchPatch: () => TE.left(new Error("not implemented")),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () => TE.right(O.none),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryNoWIFound,
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

  it("should return a 422 HTTP response when fiscal-code header is not a valid fiscal code", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        "fiscal-code": "foo",
      },
      method: "GET",
      path: {
        id: "foo",
      },
    };

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
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

  it("should return a 500 HTTP response on get error", async () => {
    const walletInstanceRepositoryThatFailsOnGet: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () => TE.left(new Error("failed on get!")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnGet,
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

  it("should return a 503 HTTP response when get returns ServiceUnavailableError", async () => {
    const walletInstanceRepositoryThatFailsOnGet: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      deleteAllByUserId: () => TE.left(new Error("not implemented")),
      getByUserId: () => TE.left(new ServiceUnavailableError("foo")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      getUserId: () => TE.left(new Error("not implemented")),
      getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnGet,
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

  it("should return a 200 HTTP response and revoked wallet instance with string os_patch_level in device_details", async () => {
    const walletInstanceRepositoryStringOsPatchLevel = {
      ...walletInstanceRepository,
      getByUserId: () =>
        TE.right(
          O.some({
            createdAt: new Date(),
            deviceDetails: {
              attestationSecurityLevel: 1,
              attestationVersion: 4,
              deviceLocked: true,
              keymasterSecurityLevel: 1,
              keymasterVersion: 41,
              osPatchLevel: "20250805",
              osVersion: 140000,
              platform: "android" as const,
              verifiedBootState: 0,
              x509Chain: ["a"],
            },
            hardwareKey: {
              crv: "P-256",
              kty: "EC" as const,
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true as const,
            revocationReason: "CERTIFICATE_REVOKED_BY_ISSUER" as const,
            revokedAt: new Date(),
            signCount: 0,
            userId: "AAACCCZ55H501P" as FiscalCode,
          }),
        ),
    };

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryStringOsPatchLevel,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: true,
          revocation_reason: "CERTIFICATE_REVOKED_BY_ISSUER",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should not call getAttestationStatusList and should return is_revoked = true when the wallet instance is already revoked", async () => {
    const walletInstanceRepositoryRevokedWI = {
      ...walletInstanceRepository,
      getByUserId: () =>
        TE.right(
          O.some({
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
            isRevoked: true as const,
            revocationReason: "NEW_WALLET_INSTANCE_CREATED" as const,
            revokedAt: new Date(),
            signCount: 0,
            userId: "AAACCC91D55H501P" as FiscalCode,
          }),
        ),
    };

    const getAttestationStatusListMock = vi.fn(() => TE.right({ entries: {} }));

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList: getAttestationStatusListMock,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryRevokedWI,
    });

    const result = await handler();

    expect(getAttestationStatusListMock).toHaveBeenCalledTimes(0);

    expect(result).toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: true,
          revocation_reason: "NEW_WALLET_INSTANCE_CREATED",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should not call getAttestationStatusList and should return a 200 response with is_revoked = false when there is no x509 chain", async () => {
    const walletInstanceRepositoryIosWI = {
      ...walletInstanceRepository,
      getByUserId: () =>
        TE.right(
          O.some({
            createdAt: new Date(),
            deviceDetails: {
              platform: "ios" as const,
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
          }),
        ),
    };

    const getAttestationStatusListMock = vi.fn(() => TE.right({ entries: {} }));

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList: getAttestationStatusListMock,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryIosWI,
    });

    const result = await handler();

    expect(getAttestationStatusListMock).toHaveBeenCalledTimes(0);

    expect(result).toEqual({
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

  it("should return a 200 response with is_revoked = true and revocation_reason = CERTIFICATE_REVOKED_BY_ISSUER when certificate has been revoked", async () => {
    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
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
          is_revoked: true,
          revocation_reason: "CERTIFICATE_REVOKED_BY_ISSUER",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 200 response with is_revoked = false when certificate has not been revoked", async () => {
    const getAttestationStatusList = () =>
      TE.right({
        entries: {
          aaa: {
            reason: "KEY_COMPROMISE",
            status: "REVOKED",
          },
        },
      });

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
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

  it("should return a 200 response with is_revoked = false when CRL request fails", async () => {
    const getAttestationStatusList = () =>
      TE.left(new Error("Failed to get CRL"));

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
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

  it("should return a 200 response with is_revoked = false when certificate has been revoked but revocation on database fails", async () => {
    const walletInstanceRepositoryBatchPatchError = {
      ...walletInstanceRepository,
      batchPatch: () => TE.left(new Error("Error!")),
    };

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryBatchPatchError,
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

  it("should call getAttestationStatusList when the wallet instance is not revoked", async () => {
    const walletInstanceRepositoryNotRevokedWI = {
      ...walletInstanceRepository,
      getByUserId: () =>
        TE.right(
          O.some({
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
          }),
        ),
    };

    const getAttestationStatusListMock = vi.fn(() => TE.right({ entries: {} }));

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList: getAttestationStatusListMock,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryNotRevokedWI,
    });

    await handler();

    expect(getAttestationStatusListMock).toHaveBeenCalledTimes(1);
  });

  it("should return a 200 response with is_revoked = true when certificate has been revoked and telemetryClient.trackEvent fails", async () => {
    const telemetryClientThatFails: appInsights.TelemetryClient = {
      trackEvent: () => {
        throw new Error("Failed to track event");
      },
      trackException: () => void 0,
    } as unknown as appInsights.TelemetryClient;

    const handler = GetWalletInstanceStatusHandler({
      getAttestationStatusList,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient: telemetryClientThatFails,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: true,
          revocation_reason: "CERTIFICATE_REVOKED_BY_ISSUER",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });
});
