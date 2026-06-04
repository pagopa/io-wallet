import { QueueClient } from "@azure/storage-queue";
import * as L from "@pagopa/logger";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { enqueue } from "@/infra/azure/storage/queue";
import { BufferDecoder } from "@/infra/decoders/buffer";
import { EnqueueWhitelistedFiscalCodesHandler } from "@/infra/handlers/enqueue-whitelisted-fiscal-codes";
import { sendTelemetryException } from "@/infra/telemetry";

vi.mock("@/infra/azure/storage/queue", () => ({
  enqueue: vi.fn(),
}));

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryException: vi.fn(() => () => E.right(undefined)),
}));

const fiscalCode1 = "AAACCC94E17H501P";
const fiscalCode2 = "BBBCCC94E17H501J";

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

describe("EnqueueWhitelistedFiscalCodesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues fiscal codes in batches", async () => {
    vi.mocked(enqueue).mockReturnValue(RTE.right(undefined));

    const result = await EnqueueWhitelistedFiscalCodesHandler({
      batchSize: 1,
      input: Buffer.from(`${fiscalCode1}\n${fiscalCode2}`),
      inputDecoder: BufferDecoder,
      logger,
      queueClient: {} as QueueClient,
    })();

    expect(vi.mocked(enqueue)).toHaveBeenNthCalledWith(1, [fiscalCode1]);
    expect(vi.mocked(enqueue)).toHaveBeenNthCalledWith(2, [fiscalCode2]);
    expect(E.isRight(result)).toBe(true);
  });

  it("enqueues fiscal codes in single batch", async () => {
    vi.mocked(enqueue).mockReturnValue(RTE.right(undefined));

    const result = await EnqueueWhitelistedFiscalCodesHandler({
      batchSize: 3,
      input: Buffer.from(`${fiscalCode1}\n${fiscalCode2}`),
      inputDecoder: BufferDecoder,
      logger,
      queueClient: {} as QueueClient,
    })();

    expect(vi.mocked(enqueue)).toHaveBeenNthCalledWith(1, [
      fiscalCode1,
      fiscalCode2,
    ]);
    expect(E.isRight(result)).toBe(true);
  });

  it("fails without enqueueing when a blob line contains an invalid fiscal code", async () => {
    const result = await EnqueueWhitelistedFiscalCodesHandler({
      batchSize: 1000,
      input: Buffer.from(`${fiscalCode1}\nINVALID\n${fiscalCode2}`),
      inputDecoder: BufferDecoder,
      logger,
      queueClient: {} as QueueClient,
    })();

    expect(vi.mocked(enqueue)).not.toHaveBeenCalled();
    expect(vi.mocked(sendTelemetryException)).toHaveBeenCalledWith({
      functionName: "enqueueWhitelistedFiscalCodes",
    });
    expect(E.isLeft(result)).toBe(true);
  });
});
