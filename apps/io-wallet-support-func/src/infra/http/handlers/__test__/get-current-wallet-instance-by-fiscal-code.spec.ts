/* eslint-disable max-lines-per-function */
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { WalletInstanceRepository } from "@/wallet-instance";

import { GetCurrentWalletInstanceByFiscalCodeHandler } from "../get-current-wallet-instance-by-fiscal-code";

describe("GetCurrentWalletInstanceByFiscalCodeHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    getLastByUserId: () =>
      TE.right(
        O.some({
          createdAt: mockDate,
          hardwareKey: {
            crv: "P-256",
            kty: "EC",
            x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
            y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
          },
          id: "123" as NonEmptyString,
          isRevoked: false,
          signCount: 0,
          userId: "AAACCCZ55H501P" as FiscalCode,
        }),
      ),
  };

  const req = {
    ...H.request("https://wallet-provider.example.org"),
    body: {
      fiscal_code: "GSPMTA98L25E625O",
    },
    method: "POST",
  };

  const mockDate = new Date("2024-09-12T08:19:49.994Z");

  it("should return a 200 HTTP response on success and valid wallet instance with no device_details", async () => {
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          created_at: mockDate,
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

  it("should return a 200 HTTP response on success and revoked wallet instance with no device_details", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      getLastByUserId: () =>
        TE.right(
          O.some({
            createdAt: mockDate,
            hardwareKey: {
              crv: "P-256",
              kty: "EC",
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true,
            revocationReason: "NEW_WALLET_INSTANCE_CREATED",
            revokedAt: mockDate,
            signCount: 0,
            userId: "AAACCCZ55H501P" as FiscalCode,
          }),
        ),
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          created_at: mockDate,
          id: "123",
          is_revoked: true,
          revocation_reason: "NEW_WALLET_INSTANCE_CREATED",
          revoked_at: mockDate,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 200 HTTP response on success and revoked wallet instance with ios device_details", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      getLastByUserId: () =>
        TE.right(
          O.some({
            createdAt: mockDate,
            deviceDetails: {
              platform: "ios",
            },
            hardwareKey: {
              crv: "P-256",
              kty: "EC",
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true,
            revocationReason: "NEW_WALLET_INSTANCE_CREATED",
            revokedAt: mockDate,
            signCount: 0,
            userId: "AAACCCZ55H501P" as FiscalCode,
          }),
        ),
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          created_at: mockDate,
          device_details: {
            platform: "ios",
          },
          id: "123",
          is_revoked: true,
          revocation_reason: "NEW_WALLET_INSTANCE_CREATED",
          revoked_at: mockDate,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 200 HTTP response on success and revoked wallet instance with android device_details", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      getLastByUserId: () =>
        TE.right(
          O.some({
            createdAt: mockDate,
            deviceDetails: {
              attestationSecurityLevel: 0,
              attestationVersion: 0,
              keymasterSecurityLevel: 0,
              keymasterVersion: 0,
              platform: "android",
            },
            hardwareKey: {
              crv: "P-256",
              kty: "EC",
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true,
            revocationReason: "NEW_WALLET_INSTANCE_CREATED",
            revokedAt: mockDate,
            signCount: 0,
            userId: "AAACCCZ55H501P" as FiscalCode,
          }),
        ),
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          created_at: mockDate,
          device_details: {
            platform: "android",
          },
          id: "123",
          is_revoked: true,
          revocation_reason: "NEW_WALLET_INSTANCE_CREATED",
          revoked_at: mockDate,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 404 HTTP response when no wallet instances is found", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      getLastByUserId: () => TE.right(O.none),
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
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

  it("should return a 422 HTTP response when body is invalid", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        foo: "foo",
      },
      method: "POST",
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
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

  it("should return a 422 HTTP response when fiscal code is invalid", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        fiscal_code: "CCC",
      },
      method: "POST",
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
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

  it("should return a 500 HTTP response on cosmos db error", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        getLastByUserId: () => TE.left(new Error("failed on getLastByUserId!")),
      };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
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

  it("should return a 503 HTTP response on cosmos db timeout error", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        getLastByUserId: () =>
          TE.left(new ServiceUnavailableError("failed on getLastByUserId!")),
      };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
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
        statusCode: 503,
      }),
    });
  });

  it("should return a 200 HTTP response on success and revoked wallet instance with string os_patch_level in device_details", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      getLastByUserId: () =>
        TE.right(
          O.some({
            createdAt: mockDate,
            deviceDetails: {
              attestationSecurityLevel: 1,
              attestationVersion: 4,
              deviceLocked: true,
              keymasterSecurityLevel: 1,
              keymasterVersion: 41,
              osPatchLevel: "20250805",
              osVersion: 140000,
              platform: "android",
              verifiedBootState: 0,
              x509Chain: ["a"],
            },
            hardwareKey: {
              crv: "P-256",
              kty: "EC",
              x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
              y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
            },
            id: "123" as NonEmptyString,
            isRevoked: true,
            revocationReason: "CERTIFICATE_REVOKED_BY_ISSUER",
            revokedAt: mockDate,
            signCount: 0,
            userId: "AAACCCZ55H501P" as FiscalCode,
          }),
        ),
    };
    const handler = GetCurrentWalletInstanceByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          created_at: mockDate,
          device_details: {
            os_patch_level: "20250805",
            os_version: 140000,
            platform: "android",
          },
          id: "123",
          is_revoked: true,
          revocation_reason: "CERTIFICATE_REVOKED_BY_ISSUER",
          revoked_at: mockDate,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });
});
