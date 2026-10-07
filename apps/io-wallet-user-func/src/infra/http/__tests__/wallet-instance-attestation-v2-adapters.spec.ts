import * as E from "fp-ts/Either";
import { describe, expect, it, vi } from "vitest";

import { runTaskEither } from "../wallet-instance-attestation-v2-adapters";

describe("wallet instance attestation V2 adapters", () => {
  it("runs a lazy task exactly once and returns its value", async () => {
    const task = vi.fn(async () => E.right("value"));

    await expect(runTaskEither(task)).resolves.toBe("value");
    expect(task).toHaveBeenCalledOnce();
  });

  it("throws the original error instance from a failed task", async () => {
    const failure = new Error("repository failed");
    const task = vi.fn(async () => E.left(failure));

    await expect(runTaskEither(task)).rejects.toBe(failure);
    expect(task).toHaveBeenCalledOnce();
  });
});
