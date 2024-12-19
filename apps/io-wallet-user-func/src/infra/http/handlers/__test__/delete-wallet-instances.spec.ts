/* eslint-disable max-lines-per-function */
import { CredentialRepository } from "@/credential";
import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as appInsights from "applicationinsights";
import * as TE from "fp-ts/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { DeleteWalletInstancesHandler } from "../delete-wallet-instances";

describe("DeleteWalletInstancesHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.left(new Error("not implemented")),
    deleteAllByUserId: () => TE.right(undefined),
    get: () => TE.left(new Error("not implemented")),
    getLastByUserId: () => TE.left(new Error("not implemented")),
    getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
    insert: () => TE.left(new Error("not implemented")),
  };

  const req = {
    ...H.request("https://wallet-provider.example.org"),
    headers: {
      "fiscal-code": "GSPMTA98L25E625O",
    },
    method: "DELETE",
  };

  const pidIssuerClient: CredentialRepository = {
    revokeAllCredentials: () => TE.right(undefined),
  };

  const telemetryClient: appInsights.TelemetryClient = {
    trackException: () => void 0,
  } as unknown as appInsights.TelemetryClient;

  it("should return a 204 HTTP response on success", async () => {
    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
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

  it("should return a 400 HTTP response when fiscal-code header is missing", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        fiscalcode: "GSPMTA98L25E625O",
      },
      method: "DELETE",
    };

    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClient,
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

  it("should return a 422 HTTP response when fiscal_code header is not a valid fiscal code", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        "fiscal-code": "foo",
      },
      method: "DELETE",
    };

    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClient,
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

  it("should return a 500 HTTP response on deleteAllByUserId error", async () => {
    const walletInstanceRepositoryThatFailsOnDelete: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        deleteAllByUserId: () =>
          TE.left(new Error("failed on deleteAllByUserId!")),
        get: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnDelete,
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

  it("should return a 500 HTTP response on revokeAllCredentials error", async () => {
    const pidIssuerClientThatFailsOnRevoke: CredentialRepository = {
      revokeAllCredentials: () =>
        TE.left(new Error("failed on revokeAllCredentials!")),
    };
    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClientThatFailsOnRevoke,
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
        statusCode: 500,
      }),
    });
  });

  it("should return a 503 HTTP response when deleteAllByUserId returns ServiceUnavailableError", async () => {
    const walletInstanceRepositoryThatFailsOnDelete: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        deleteAllByUserId: () => TE.left(new ServiceUnavailableError()),
        get: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        getValidByUserIdExcludingOne: () =>
          TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnDelete,
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

  it("should return a 503 HTTP response when revokeAllCredentials returns ServiceUnavailableError", async () => {
    const pidIssuerClientThatFailsOnRevoke: CredentialRepository = {
      revokeAllCredentials: () => TE.left(new ServiceUnavailableError("foo")),
    };
    const handler = DeleteWalletInstancesHandler({
      credentialRepository: pidIssuerClientThatFailsOnRevoke,
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
        statusCode: 503,
      }),
    });
  });
});
