import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { GetNonceHandler } from "../get-nonce";
import { NonceRepository } from "../../../../nonce";

describe("GetNonceHandler", async () => {
  const nonceRepository: NonceRepository = {
    insert: () => Promise.resolve(undefined),
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

  it("should return a 200 HTTP response", () => {
    expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 200,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: expect.objectContaining({
            nonce: expect.any(String),
          }),
        }),
      })
    );
  });
});
