import type { Database } from "@azure/cosmos";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { describe, expect, it, vi } from "vitest";

import { CosmosDbStatusListPagesRepository } from "../status-list-pages";

describe("CosmosDbStatusListPagesRepository", () => {
  it("creates one empty page document per status list page with pageBitsSize metadata", async () => {
    const executeBulkOperations = vi
      .fn()
      .mockResolvedValue(
        Array.from({ length: 256 }, () => ({ error: undefined })),
      );

    const database = {
      container: vi.fn().mockReturnValue({
        items: {
          executeBulkOperations,
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListPagesRepository(
      database,
      256,
      4096,
    );

    await expect(
      repository.createEmptyPagesForStatusList("list-a" as NonEmptyString),
    ).resolves.toBeUndefined();

    expect(executeBulkOperations).toHaveBeenCalledTimes(1);

    const operations = executeBulkOperations.mock.calls[0][0];
    expect(operations).toHaveLength(256);
    expect(operations[0]).toEqual({
      operationType: "Create",
      partitionKey: "list-a",
      resourceBody: {
        bitsetBase64: Buffer.alloc(4096 / 8).toString("base64"),
        id: "list-a:0",
        pageBitsSize: 4096,
        pageIndex: 0,
        statusListId: "list-a",
      },
    });
    expect(operations[255].resourceBody.id).toBe("list-a:255");
    expect(operations[255].resourceBody.pageBitsSize).toBe(4096);
  });

  it("treats existing page documents as already provisioned during recovery", async () => {
    const executeBulkOperations = vi
      .fn()
      .mockResolvedValue([{ error: { code: 409 } }, { error: undefined }]);

    const database = {
      container: vi.fn().mockReturnValue({
        items: {
          executeBulkOperations,
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListPagesRepository(database, 2, 4096);

    await expect(
      repository.createEmptyPagesForStatusList("list-a" as NonEmptyString),
    ).resolves.toBeUndefined();
  });
});
