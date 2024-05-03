import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as TE from "fp-ts/TaskEither";
import { GetUserIdByFiscalCodeHandler } from "../get-user-id-by-fiscal-code";
import { UserIdRepository } from "@/user";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

describe("GetUserIdByFiscalCodeHandler", () => {
  const userIdRepository: UserIdRepository = {
    getUserIdByFiscalCode: () => TE.right({ id: "pdv_id" as NonEmptyString }),
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
    const handler = GetUserIdByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userIdRepository,
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
    const handler = GetUserIdByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userIdRepository,
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

  it("should return a 500 HTTP response when getUserIdByFiscalCode returns error", async () => {
    const userIdRepositoryThatFailsOnGetUserIdByFiscalCode: UserIdRepository = {
      getUserIdByFiscalCode: () =>
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
    const handler = GetUserIdByFiscalCodeHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userIdRepository: userIdRepositoryThatFailsOnGetUserIdByFiscalCode,
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
