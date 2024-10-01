import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { UserRepository } from "io-wallet-common/user";
import { describe, expect, it } from "vitest";

import { GetUserByFiscalCodeHandler } from "../get-user-by-fiscal-code";

describe("GetUserByFiscalCodeHandler", () => {
  const userRepository: UserRepository = {
    getOrCreateUserByFiscalCode: () =>
      TE.right({ id: "pdv_id" as NonEmptyString }),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  it("should return a 200 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        fiscal_code: "GSPMTA98L25E625O",
      },
      method: "POST",
    };
    const handler = GetUserByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      userRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: { id: "pdv_id" },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        foo: "GSPMTA98L25E625O",
      },
      method: "POST",
    };
    const handler = GetUserByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      userRepository,
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

  it("should return a 500 HTTP response when getUserByFiscalCode returns error", async () => {
    const userRepositoryThatFailsOnGetUserByFiscalCode: UserRepository = {
      getOrCreateUserByFiscalCode: () =>
        TE.left(new Error("failed on getIdByFiscalCode!")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        fiscal_code: "GSPMTA98L25E625O",
      },
      method: "POST",
    };
    const handler = GetUserByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      userRepository: userRepositoryThatFailsOnGetUserByFiscalCode,
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
