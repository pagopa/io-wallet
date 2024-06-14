import { NonceRepository, generateNonce } from "@/nonce";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it, vi } from "vitest";

import { GetNonceHandler } from "../get-nonce";

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
    delete: () => TE.left(new Error("not implemented")),
    insert: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const handler = GetNonceHandler({
    input: H.request("https://api.test.it/"),
    inputDecoder: H.HttpRequest,
    logger,
    nonceRepository,
  });

  it("should return a 200 HTTP response on success", async () => {
    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          nonce: "nonce",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 500 HTTP response when generateNonce returns error", async () => {
    vi.mocked(generateNonce).mockReturnValueOnce(E.left(new Error("error")));
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

  it("should return a 500 HTTP response when insertNonce returns error", async () => {
    const nonceRepositoryThatFailsOnInsert: NonceRepository = {
      delete: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("failed on insert!")),
    };

    const handler = GetNonceHandler({
      input: H.request("https://api.test.it/"),
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository: nonceRepositoryThatFailsOnInsert,
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
