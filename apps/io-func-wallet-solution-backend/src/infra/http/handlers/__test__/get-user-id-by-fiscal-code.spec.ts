import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { GetUserIdByFiscalCodeHandler } from "../get-user-id-by-fiscal-code";
import { UserIdRepository } from "@/user";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

describe("GetUserIdByFiscalCodeHandler", () => {
  const userIdRepository: UserIdRepository = {
    getUserIdByFiscalCode: () => TE.right({ id: "pdv_id" as NonEmptyString }),
    getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
  };

  it("should return a 200 HTTP response on success", () => {
    const handler = GetUserIdByFiscalCodeHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: {
          fiscal_code: "GSPMTA98L25E625O",
        },
      })),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userIdRepository,
    });

    expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 200,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: { id: "pdv_id" },
        }),
      })
    );
  });

  it("should return a 422 HTTP response on invalid body", () => {
    const handler = GetUserIdByFiscalCodeHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: {
          foo: "GSPMTA98L25E625O",
        },
      })),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userIdRepository,
    });

    expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 422,
          headers: expect.objectContaining({
            "Content-Type": "application/problem+json",
          }),
        }),
      })
    );
  });

  it("should return a 500 HTTP response when getUserIdByFiscalCode returns error", () => {
    const userIdRepositoryThatFailsOnGetUserIdByFiscalCode: UserIdRepository = {
      getUserIdByFiscalCode: () =>
        TE.left(new Error("failed on getIdByFiscalCode!")),
      getFiscalCodeByUserId: () => TE.left(new Error("not implemented")),
    };

    const handler = GetUserIdByFiscalCodeHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: {
          fiscal_code: "GSPMTA98L25E625O",
        },
      })),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      userIdRepository: userIdRepositoryThatFailsOnGetUserIdByFiscalCode,
    });

    expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 500,
          headers: expect.objectContaining({
            "Content-Type": "application/problem+json",
          }),
        }),
      })
    );
  });
});
