import { describe, it, expect } from "vitest";

import { pipe, identity } from "fp-ts/function";

import * as E from "fp-ts/Either";
import { healthCheck } from "../health-check";

describe("healthCkeck", () => {
  it("returns a string", async () => {
    const run = healthCheck();
    const result = pipe(await run(), E.getOrElseW(identity));
    expect(result).toBe("It's working!");
  });
});
