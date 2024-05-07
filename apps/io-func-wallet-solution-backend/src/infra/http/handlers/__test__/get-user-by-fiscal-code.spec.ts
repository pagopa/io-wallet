import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as TE from "fp-ts/TaskEither";
import { GetUserByFiscalCodeHandler } from "../get-user-by-fiscal-code";
import { UserRepository } from "@/user";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

describe("GetUserByFiscalCodeHandler", () => {
  const userRepository: UserRepository = {
    getUserByFiscalCode: () => TE.right({ id: "pdv_id" as NonEmptyString }),
    getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
  };

  it("should return a 200 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: {
        fiscal_code: "GSPMTA98L25E625O",
      },
    };
    const handler = GetUserByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        statusCode: 200,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: { id: "pdv_id" },
      },
    });
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: {
        foo: "GSPMTA98L25E625O",
      },
    };
    const handler = GetUserByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 422,
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
      }),
    });
  });

  it("should return a 500 HTTP response when getUserByFiscalCode returns error", async () => {
    const userRepositoryThatFailsOnGetUserByFiscalCode: UserRepository = {
      getUserByFiscalCode: () =>
        TE.left(new Error("failed on getIdByFiscalCode!")),
      getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: {
        fiscal_code: "GSPMTA98L25E625O",
      },
    };
    const handler = GetUserByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userRepository: userRepositoryThatFailsOnGetUserByFiscalCode,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 500,
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
      }),
    });
  });
});
