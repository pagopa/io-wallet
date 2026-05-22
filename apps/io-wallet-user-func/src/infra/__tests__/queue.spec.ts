import { QueueClient } from "@azure/storage-queue";
import * as E from "fp-ts/Either";
import { describe, expect, it, vi } from "vitest";

import { enqueue } from "@/infra/azure/storage/queue";

const queueMessage = { statusListId: "status-list-1" };

describe("enqueue", () => {
  it("retries a failed enqueue until one attempt succeeds", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary queue failure"))
      .mockRejectedValueOnce(new Error("temporary queue failure"))
      .mockResolvedValueOnce({ errorCode: undefined });

    const result = await enqueue(queueMessage)({
      queueClient: { sendMessage } as unknown as QueueClient,
    })();

    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(E.isRight(result)).toBe(true);
  });

  it("returns left only after all enqueue retries fail", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValue(new Error("temporary queue failure"));

    const result = await enqueue(queueMessage)({
      queueClient: { sendMessage } as unknown as QueueClient,
    })();

    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(E.isLeft(result)).toBe(true);

    if (E.isRight(result)) {
      throw new Error("Expected enqueue to fail after exhausting retries");
    }

    expect(result.left.message).toBe("temporary queue failure");
  });
});
