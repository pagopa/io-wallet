import { QueueClient } from "@azure/storage-queue";
import { describe, expect, it } from "vitest";

import { split } from "../insert-fiscal-codes-in-queue";

// TODO [SIW-1995]: move the test and the `split` function elsewhere
describe("split", () => {
  const queueClient = {} as unknown as QueueClient;

  it("should split the string in array of batch of CF", () => {
    const result = split(
      "AAABBB91E17H501J\nZZZBBB91E17H501J\nDDDBBB91E17H501J\nCCCBBB91E17H501J\nTTTBBB91E17H501J",
    )({ batchSize: 2, queueClient });
    const expectedArray = [
      "AAABBB91E17H501J\nZZZBBB91E17H501J\n",
      "DDDBBB91E17H501J\nCCCBBB91E17H501J\n",
      "TTTBBB91E17H501J",
    ];

    expect(result).toEqual(expectedArray);
  });
});
