import { describe, it, expect } from "vitest";

import { pipe, identity } from "fp-ts/function";

import * as E from "fp-ts/Either";
import { hello } from "../hello";

describe("getHelloWorld", () => {
  it("returns a string", async () => {
    const run = hello()({
      myName: "test",
    });
    const result = pipe(await run(), E.getOrElseW(identity));
    expect(result).toBe("Hello test!");
  });
});
