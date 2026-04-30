import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  StatusListAllocationConflictError,
  StatusListAllocatorCatalogDataSource,
  StatusListAllocatorRoutingDataSource,
  StatusListAllocatorService,
} from "@/infra/status-list-allocator";

const allocationConflictEvent = () => ({
  name: "StatusListAllocation",
  properties: {
    operation: "reserveNextBlockConflict",
  },
});

const telemetryMocks = vi.hoisted(() => ({
  sendTelemetryCustomEvent: vi.fn(() => E.right(undefined)),
}));

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryCustomEvent: telemetryMocks.sendTelemetryCustomEvent,
}));

const createStatusListAllocationCache = () => ({
  reservedBlock: undefined,
});

const makeCatalogDataSource = (
  reserveNextBlock: StatusListAllocatorCatalogDataSource["reserveNextBlock"],
): StatusListAllocatorCatalogDataSource => ({
  reserveNextBlock,
});

const makeRoutingDataSource = (
  getOpenStatusListIds: StatusListAllocatorRoutingDataSource["getOpenStatusListIds"],
): StatusListAllocatorRoutingDataSource => ({
  getOpenStatusListIds,
});

describe("StatusListAllocatorService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    telemetryMocks.sendTelemetryCustomEvent.mockClear();

    const routingRepository = makeRoutingDataSource(async () => [
      "flush-list" as NonEmptyString,
    ]);
    const allocator = new StatusListAllocatorService(
      makeCatalogDataSource(async () => 0),
      routingRepository,
      createStatusListAllocationCache(),
      {
        blockSize: 1,
      },
    );

    await allocator.allocateStatusBinding();
    telemetryMocks.sendTelemetryCustomEvent.mockClear();
  });

  it("reuses the in-memory leased block until it is exhausted", async () => {
    const reserveNextBlock = vi.fn().mockResolvedValue(10);

    const allocator = new StatusListAllocatorService(
      makeCatalogDataSource(reserveNextBlock),
      makeRoutingDataSource(async () => ["list-a" as NonEmptyString]),
      createStatusListAllocationCache(),
      {
        blockSize: 2,
      },
    );

    await expect(allocator.allocateStatusBinding()).resolves.toEqual({
      _tag: "Right",
      right: {
        index: 10,
        statusListId: "list-a",
      },
    });
    await expect(allocator.allocateStatusBinding()).resolves.toEqual({
      _tag: "Right",
      right: {
        index: 11,
        statusListId: "list-a",
      },
    });

    expect(reserveNextBlock).toHaveBeenCalledTimes(1);
    expect(telemetryMocks.sendTelemetryCustomEvent).not.toHaveBeenCalled();
  });

  it("starts the scan from a random OPEN list", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const reserveNextBlock = vi
      .fn<StatusListAllocatorCatalogDataSource["reserveNextBlock"]>()
      .mockImplementation(async (statusListId) => {
        if (statusListId !== "list-b") {
          return undefined;
        }

        return 20;
      });

    const allocator = new StatusListAllocatorService(
      makeCatalogDataSource(reserveNextBlock),
      makeRoutingDataSource(async () => [
        "list-a" as NonEmptyString,
        "list-b" as NonEmptyString,
      ]),
      createStatusListAllocationCache(),
      {
        blockSize: 1,
      },
    );

    await expect(allocator.allocateStatusBinding()).resolves.toEqual({
      _tag: "Right",
      right: {
        index: 20,
        statusListId: "list-b",
      },
    });
    expect(reserveNextBlock).toHaveBeenNthCalledWith(1, "list-b", 1);
    expect(telemetryMocks.sendTelemetryCustomEvent).not.toHaveBeenCalled();
  });

  it("retries on allocation conflicts and falls back to another OPEN list", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reserveNextBlock = vi
      .fn()
      .mockRejectedValueOnce(new StatusListAllocationConflictError("list-a"))
      .mockResolvedValueOnce(20);

    const allocator = new StatusListAllocatorService(
      makeCatalogDataSource(reserveNextBlock),
      makeRoutingDataSource(async () => [
        "list-a" as NonEmptyString,
        "list-b" as NonEmptyString,
      ]),
      createStatusListAllocationCache(),
      {
        blockSize: 1,
      },
    );

    await expect(allocator.allocateStatusBinding()).resolves.toEqual({
      _tag: "Right",
      right: {
        index: 20,
        statusListId: "list-b",
      },
    });
    expect(reserveNextBlock).toHaveBeenCalledTimes(2);
    expect(telemetryMocks.sendTelemetryCustomEvent).toHaveBeenCalledTimes(1);
    expect(telemetryMocks.sendTelemetryCustomEvent).toHaveBeenCalledWith(
      allocationConflictEvent(),
    );
  });

  it("serializes concurrent allocations while a block lease is in flight", async () => {
    let resolveReservation: ((value: number) => void) | undefined;

    const reserveNextBlock = vi
      .fn<StatusListAllocatorCatalogDataSource["reserveNextBlock"]>()
      .mockImplementation(
        () =>
          new Promise<number>((resolve) => {
            resolveReservation = resolve;
          }),
      );

    const allocator = new StatusListAllocatorService(
      makeCatalogDataSource(reserveNextBlock),
      makeRoutingDataSource(async () => ["list-a" as NonEmptyString]),
      createStatusListAllocationCache(),
      {
        blockSize: 2,
      },
    );

    const firstAllocation = allocator.allocateStatusBinding();
    const secondAllocation = allocator.allocateStatusBinding();

    await Promise.resolve();
    await Promise.resolve();

    expect(reserveNextBlock).toHaveBeenCalledTimes(1);

    resolveReservation?.(10);

    await expect(firstAllocation).resolves.toEqual({
      _tag: "Right",
      right: {
        index: 10,
        statusListId: "list-a",
      },
    });
    await expect(secondAllocation).resolves.toEqual({
      _tag: "Right",
      right: {
        index: 11,
        statusListId: "list-a",
      },
    });

    expect(reserveNextBlock).toHaveBeenCalledTimes(1);
    expect(telemetryMocks.sendTelemetryCustomEvent).not.toHaveBeenCalled();
  });
});
