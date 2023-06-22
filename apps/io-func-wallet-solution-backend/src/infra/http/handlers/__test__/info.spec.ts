import { it, expect, describe } from "vitest";

import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";

import { InfoHandler } from "../info";

describe("InfoHandler", () => {
  it("should return a 200 HTTP response", () => {
    const run = InfoHandler({
      input: H.request("vitest"),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
    });
    expect(run()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 200,
        }),
      })
    );
  });
});
