/* eslint-disable max-lines-per-function */
import { CredentialRepository } from "@/credential";
import { JwtValidate } from "@/jwt-validator";
import { SubscriptionStateEnum, UserTrialSubscriptionRepository } from "@/user";
import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as TE from "fp-ts/TaskEither";
import { UnauthorizedError } from "io-wallet-common/error";
import { describe, expect, it } from "vitest";

import { SetWalletInstanceStatusHandler } from "../set-wallet-instance-status";

describe("SetWalletInstanceStatusHandler", () => {
  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    get: () => TE.left(new Error("not implemented")),
    getAllByUserId: () => TE.left(new Error("not implemented")),
    getLastByUserId: () => TE.left(new Error("not implemented")),
    insert: () => TE.left(new Error("not implemented")),
  };

  const jwtValidate: JwtValidate = () =>
    TE.right({
      fiscal_number: "AAACCC94D55H501P",
    });

  const userTrialSubscriptionRepository: UserTrialSubscriptionRepository = {
    featureFlag: "true",
    getUserSubscriptionDetail: () =>
      TE.right({
        state: SubscriptionStateEnum["ACTIVE"],
      }),
  };

  const pidIssuerClient: CredentialRepository = {
    revokeAllCredentials: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  it("should return a 204 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org/"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 204,
      }),
    });
  });

  it("should return a 400 HTTP response when authorization header is missing", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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

  it("should return a 422 HTTP response when authorization header is an empty string", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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

  it("should return a 422 HTTP response when token is missing in authorization header", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer ",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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

  it("should return a 422 HTTP response when token does not contain `fiscal_number`", async () => {
    const jwtValidate: JwtValidate = () =>
      TE.right({
        foo: "AAACCC94D55H501P",
      });

    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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
      body: "revoked",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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

  it("should return a 401 HTTP response on jwt forbidden error", async () => {
    const jwtValidateThatFails: JwtValidate = () =>
      TE.left(new UnauthorizedError());
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate: jwtValidateThatFails,
      logger,
      userTrialSubscriptionRepository,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 401,
      }),
    });
  });

  it("should return a 403 HTTP response on inactive user subscription", async () => {
    const userTrialSubscriptionRepositoryUnsubscribed: UserTrialSubscriptionRepository =
      {
        featureFlag: "true",
        getUserSubscriptionDetail: () =>
          TE.right({
            state: SubscriptionStateEnum["UNSUBSCRIBED"],
          }),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository:
        userTrialSubscriptionRepositoryUnsubscribed,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 403,
      }),
    });
  });

  it("should return a 403 HTTP response on isUserSubscriptionActive error", async () => {
    const userTrialSubscriptionRepositoryThatFails: UserTrialSubscriptionRepository =
      {
        featureFlag: "true",
        getUserSubscriptionDetail: () =>
          TE.left(new Error("failed on getUserSubscriptionDetail!")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository: userTrialSubscriptionRepositoryThatFails,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 403,
      }),
    });
  });

  it("should return a 500 HTTP response on revokeAllCredentials error", async () => {
    const pidIssuerClientThatFailsOnRevoke: CredentialRepository = {
      revokeAllCredentials: () =>
        TE.left(new Error("failed on revokeAllCredentials!")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClientThatFailsOnRevoke,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("not implemented")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userTrialSubscriptionRepository,
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

  it("should return a 500 HTTP response on jwtValidate error", async () => {
    const jwtValidateThatFails: JwtValidate = () =>
      TE.left(new Error("failed on jwtValidationAndDecode!"));

    const req = {
      ...H.request("https://wallet-provider.example.org/"),
      body: "REVOKED",
      headers: {
        authorization: "Bearer xxx",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      credentialRepository: pidIssuerClient,
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate: jwtValidateThatFails,
      logger,
      userTrialSubscriptionRepository,
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
});
