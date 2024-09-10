/* eslint-disable max-lines-per-function */
import { JwtValidate } from "@/jwt-validator";
import { SubscriptionStateEnum, UserTrialSubscriptionRepository } from "@/user";
import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { UnauthorizedError } from "io-wallet-common/error";
import { UserRepository } from "io-wallet-common/user";
import { describe, expect, it } from "vitest";

import { GetCurrentWalletInstanceStatusHandler } from "../get-current-wallet-instance-status";

describe("GetCurrentWalletInstanceStatusHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.left(new Error("not implemented")),
    get: () => TE.left(new Error("not implemented")),
    getAllByUserId: () => TE.left(new Error("not implemented")),
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
          userId: "123" as NonEmptyString,
        }),
      ),
    insert: () => TE.left(new Error("not implemented")),
  };

  const userRepository: UserRepository = {
    getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
    getOrCreateUserByFiscalCode: () =>
      TE.right({ id: "pdv_id" as NonEmptyString }),
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

  it("should return a 200 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "Bearer xxx",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
      userTrialSubscriptionRepository,
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

  it("should return a 400 HTTP response when authorization header is missing", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
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
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
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
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
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
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
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
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate: jwtValidateThatFails,
      logger,
      userRepository,
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
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
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

  it("should return a 404 HTTP response when no wallet instances is found", async () => {
    const walletInstanceRepository: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      get: () => TE.left(new Error("not implemented")),
      getAllByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.right(O.none),
      insert: () => TE.left(new Error("not implemented")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "Bearer xxx",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
      userTrialSubscriptionRepository,
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

  it("should return a 500 HTTP response on getLastByUserId error", async () => {
    const walletInstanceRepositoryThatFailsOnGetLastByUserId: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        get: () => TE.left(new Error("not implemented")),
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.left(new Error("failed on getLastByUserId!")),
        insert: () => TE.left(new Error("not implemented")),
      };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "Bearer xxx",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate,
      logger,
      userRepository,
      userTrialSubscriptionRepository,
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

  it("should return a 500 HTTP response on jwtValidate error", async () => {
    const jwtValidateThatFails: JwtValidate = () =>
      TE.left(new Error("failed on jwtValidationAndDecode!"));

    const req = {
      ...H.request("https://wallet-provider.example.org"),
      headers: {
        authorization: "Bearer xxx",
      },
    };
    const handler = GetCurrentWalletInstanceStatusHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      jwtValidate: jwtValidateThatFails,
      logger,
      userRepository,
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
