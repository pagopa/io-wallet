import { describe, expect, it } from "vitest";

import { HealthHandler } from "../health";

describe("HealthHandler", () => {
  it("should return a 204 HTTP response", async () => {
    await expect(HealthHandler()).resolves.toEqual({
      status: 204,
    });
  });
});
