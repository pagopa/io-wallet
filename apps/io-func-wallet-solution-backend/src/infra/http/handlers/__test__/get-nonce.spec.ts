import { it, expect, describe, vi } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { GetNonceHandler } from "../get-nonce";
import { NonceRepository, generateNonce } from "@/nonce";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

const mocks = vi.hoisted(() => ({
  generateNonce: vi.fn(),
}));

vi.mocked(generateNonce).mockReturnValue(E.right("nonce"));

vi.mock("@/nonce", async (importOriginal) => {
  const module = await importOriginal<typeof import("@/nonce")>();
  return {
    ...module,
    generateNonce: mocks.generateNonce,
  };
});

describe("GetNonceHandler", () => {
  const nonceRepository: NonceRepository = {
    insert: () => TE.right(undefined),
    delete: () => TE.left(new Error("not implemented")),
  };

  const handler = GetNonceHandler({
    input: H.request("https://api.test.it/"),
    inputDecoder: H.HttpRequest,
    logger: {
      log: () => () => {},
      format: L.format.simple,
    },
    nonceRepository,
  });

  it("should return a 200 HTTP response on success", async () => {
    await expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 200,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.objectContaining({
            nonce: "nonce",
          }),
        }),
      })
    );
  });

  it("should return a 500 HTTP response when generateNonce returns error", async () => {
    vi.mocked(generateNonce).mockReturnValueOnce(E.left(new Error("error")));
    await expect(handler()).resolves.toEqual(
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

  it("should return a 500 HTTP response when insertNonce returns error", async () => {
    const nonceRepositoryThatFailsOnInsert: NonceRepository = {
      insert: () => TE.left(new Error("failed on insert!")),
      delete: () => TE.left(new Error("not implemented")),
    };

    const handler = GetNonceHandler({
      input: H.request("https://api.test.it/"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      nonceRepository: nonceRepositoryThatFailsOnInsert,
    });

    await expect(handler()).resolves.toEqual(
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
