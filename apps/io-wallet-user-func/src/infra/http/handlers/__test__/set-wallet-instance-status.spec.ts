/* eslint-disable max-lines-per-function */
import { HslJwtValidate } from "@/jwt-validator";
import {
  SubscriptionStateEnum,
  UserRepository,
  UserTrialSubscriptionRepository,
} from "@/user";
import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
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

  const userRepository: UserRepository = {
    getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
    getOrCreateUserByFiscalCode: () =>
      TE.right({ id: "pdv_id" as NonEmptyString }),
  };

  const hslJwtValidate: HslJwtValidate = () =>
    TE.right({
      fiscal_number: "AAACCC94D55H501P",
    });

  // test di quando questa va in errore
  const userTrialSubscriptionRepository: UserTrialSubscriptionRepository = {
    featureFlag: "true",
    getUserSubscriptionDetail: () =>
      TE.right({
        state: SubscriptionStateEnum["ACTIVE"],
      }),
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
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      userRepository,
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
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
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
    const handler = SetWalletInstanceStatusHandler({
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
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
    const handler = SetWalletInstanceStatusHandler({
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
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
    const hslJwtValidate: HslJwtValidate = () =>
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
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
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
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
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

  it("should return a 500 HTTP response on getOrCreateUserByFiscalCode error", async () => {
    const userRepositoryThatFailsOnGetUser: UserRepository = {
      getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
      getOrCreateUserByFiscalCode: () =>
        TE.left(new Error("failed on getOrCreateUserByFiscalCode!")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: "REVOKED",
      headers: {
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaXNjYWxfbnVtYmVyIjoiQUFBQkJCOTRENTVINTAxUCIsImlhdCI6MTcxOTkyMzkwOSwiZXhwIjoxNzE5OTI3NTA5fQ.TvNm1IBz0PCXxZXBcNvXWvpeX1tJANNciaaEpW-kuTk",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      userRepository: userRepositoryThatFailsOnGetUser,
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
        authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaXNjYWxfbnVtYmVyIjoiQUFBQkJCOTRENTVINTAxUCIsImlhdCI6MTcxOTkyMzkwOSwiZXhwIjoxNzE5OTI3NTA5fQ.TvNm1IBz0PCXxZXBcNvXWvpeX1tJANNciaaEpW-kuTk",
      },
      method: "PUT",
      path: {
        id: "foo",
      },
    };
    const handler = SetWalletInstanceStatusHandler({
      hslJwtValidate,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      userRepository,
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

  it("should return a 500 HTTP response on hslValidate error", async () => {
    const hslValidateThatFails: HslJwtValidate = () =>
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
      hslJwtValidate: hslValidateThatFails,
      input: req,
      inputDecoder: H.HttpRequest,
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

  // it("should return a 500 HTTP response on jwtValidationAndDecode error", async () => {
  //   const hslJwtValidationThatFailsOnHslIntrospect: HslJwtValidation = {
  //     introspectHslJwtValidation: () =>
  //       TE.left(new Error("failed on introspectHslJwtValidation!")),
  //     jwtValidationAndDecode: () =>
  //       TE.right({
  //         fiscal_number: "AAACCC94D55H501P",
  //       }),
  //   };
  //   const req = {
  //     ...H.request("https://wallet-provider.example.org/"),
  //     body: "REVOKED",
  //     headers: {
  //       authorization: "Bearer xxx",
  //     },
  //     method: "PUT",
  //     path: {
  //       id: "foo",
  //     },
  //   };
  //   const handler = SetWalletInstanceStatusHandler({
  //     hslJwtValidation: hslJwtValidationThatFailsOnHslIntrospect,
  //     input: req,
  //     inputDecoder: H.HttpRequest,
  //     logger,
  //     userRepository,
  //     walletInstanceRepository,
  //   });

  //   await expect(handler()).resolves.toEqual({
  //     _tag: "Right",
  //     right: expect.objectContaining({
  //       headers: expect.objectContaining({
  //         "Content-Type": "application/problem+json",
  //       }),
  //       statusCode: 500,
  //     }),
  //   });
  // });
});
