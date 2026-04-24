/* eslint-disable max-lines-per-function */
import type { Database } from "@azure/cosmos";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { describe, expect, it, vi } from "vitest";

import { StatusListAllocationConflictError } from "@/infra/status-list-allocator";

import { CosmosDbStatusListCatalogRepository } from "../status-list-catalog";

describe("CosmosDbStatusListCatalogRepository", () => {
  it("reads stale INITIALIZING status lists using a bounded page", async () => {
    const fetchNext = vi.fn().mockResolvedValue({
      resources: [{ id: "list-1" }],
    });
    const query = vi.fn().mockReturnValue({
      fetchNext,
    });

    const database = {
      container: () => ({
        item: vi.fn(),
        items: {
          create: vi.fn(),
          executeBulkOperations: vi.fn(),
          query,
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListCatalogRepository(
      database,
      4,
      256,
    );

    await expect(
      repository.listStaleInitializingStatusListIds(new Date("2026-04-22")),
    ).resolves.toEqual(["list-1"]);

    expect(query).toHaveBeenCalledWith(
      {
        parameters: [
          {
            name: "@initializedBefore",
            value: "2026-04-22T00:00:00.000Z",
          },
          {
            name: "@initializingState",
            value: "INITIALIZING",
          },
        ],
        query:
          "SELECT c.id FROM c WHERE c.state = @initializingState AND c.initializedAt < @initializedBefore",
      },
      {
        maxItemCount: 50,
      },
    );
    expect(fetchNext).toHaveBeenCalledTimes(1);
  });

  it("stores openedAt when an INITIALIZING status list becomes OPEN", async () => {
    const patch = vi.fn().mockResolvedValue(undefined);

    const database = {
      container: () => ({
        item: () => ({
          patch,
        }),
        items: {
          create: vi.fn(),
          executeBulkOperations: vi.fn(),
          query: vi.fn(),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListCatalogRepository(
      database,
      4,
      256,
    );

    await expect(
      repository.openStatusList("list-1" as NonEmptyString),
    ).resolves.toBeUndefined();

    expect(patch).toHaveBeenCalledWith({
      condition: "from c where c.state = 'INITIALIZING'",
      operations: [
        {
          op: "set",
          path: "/state",
          value: "OPEN",
        },
        {
          op: "set",
          path: "/openedAt",
          value: expect.any(String),
        },
      ],
    });
  });

  it("treats a 412 conditional patch failure as already opened elsewhere", async () => {
    const patch = vi.fn().mockRejectedValue(
      Object.assign(new Error("precondition failed"), {
        statusCode: 412,
      }),
    );

    const database = {
      container: () => ({
        item: () => ({
          patch,
        }),
        items: {
          create: vi.fn(),
          executeBulkOperations: vi.fn(),
          query: vi.fn(),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListCatalogRepository(
      database,
      4,
      256,
    );

    await expect(
      repository.openStatusList("list-1" as NonEmptyString),
    ).resolves.toBeUndefined();

    expect(patch).toHaveBeenCalledWith({
      condition: "from c where c.state = 'INITIALIZING'",
      operations: [
        {
          op: "set",
          path: "/state",
          value: "OPEN",
        },
        {
          op: "set",
          path: "/openedAt",
          value: expect.any(String),
        },
      ],
    });
  });

  it("stores sealedAt when OPEN status lists become SEALED", async () => {
    const executeBulkOperations = vi
      .fn()
      .mockResolvedValue([{ error: undefined }]);

    const database = {
      container: () => ({
        item: vi.fn(),
        items: {
          create: vi.fn(),
          executeBulkOperations,
          query: vi.fn().mockReturnValue({
            fetchAll: vi.fn().mockResolvedValue({
              resources: [{ id: "list-1" }],
            }),
          }),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListCatalogRepository(
      database,
      4,
      256,
    );

    await expect(repository.closeAlmostFullStatusLists(256)).resolves.toEqual([
      "list-1",
    ]);

    expect(executeBulkOperations).toHaveBeenCalledWith([
      {
        id: "list-1",
        operationType: "Patch",
        partitionKey: "list-1",
        resourceBody: {
          condition:
            "from c where c.nextFreeIndex > (c.capacityBits - 256) AND c.state = 'OPEN'",
          operations: [
            {
              op: "set",
              path: "/state",
              value: "SEALED",
            },
            {
              op: "set",
              path: "/sealedAt",
              value: expect.any(String),
            },
          ],
        },
      },
    ]);
  });

  it("returns a conflict error when block reservation hits a Cosmos 412 conflict", async () => {
    const patch = vi.fn().mockRejectedValue(
      Object.assign(new Error("precondition failed"), {
        statusCode: 412,
      }),
    );

    const database = {
      container: () => ({
        item: () => ({
          patch,
          read: () =>
            Promise.resolve({
              etag: "etag-1",
              resource: {
                capacityBits: 1024,
                id: "list-1",
                initializedAt: new Date().toISOString(),
                nextFreeIndex: 0,
                state: "OPEN",
              },
            }),
        }),
        items: {
          create: vi.fn(),
          executeBulkOperations: vi.fn(),
          query: vi.fn(),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListCatalogRepository(
      database,
      4,
      256,
    );

    await expect(
      repository.reserveNextBlock("list-1" as NonEmptyString, 256),
    ).rejects.toThrow(StatusListAllocationConflictError);
  });
});
