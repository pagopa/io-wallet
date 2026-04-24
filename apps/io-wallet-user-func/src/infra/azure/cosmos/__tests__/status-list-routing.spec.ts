import type { Database } from "@azure/cosmos";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { describe, expect, it, vi } from "vitest";

import { InvalidCosmosResourceError } from "@/infra/azure/cosmos/errors";

import { CosmosDbStatusListRoutingRepository } from "../status-list-routing";

describe("CosmosDbStatusListRoutingRepository", () => {
  it("loads the routable status list ids from the routing container", async () => {
    const database = {
      container: vi.fn().mockReturnValue({
        items: {
          query: vi.fn().mockReturnValue({
            fetchAll: vi.fn().mockResolvedValue({
              resources: [{ id: "list-a" }, { id: "list-b" }],
            }),
          }),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListRoutingRepository(database);

    await expect(repository.getOpenStatusListIds()).resolves.toEqual([
      "list-a" as NonEmptyString,
      "list-b" as NonEmptyString,
    ] as const);
  });

  it("fails when the routing documents do not match the collection contract", async () => {
    const database = {
      container: vi.fn().mockReturnValue({
        items: {
          query: vi.fn().mockReturnValue({
            fetchAll: vi.fn().mockResolvedValue({
              resources: [{ statusListId: "list-a" }],
            }),
          }),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListRoutingRepository(database);

    await expect(repository.getOpenStatusListIds()).rejects.toThrow(
      InvalidCosmosResourceError,
    );
  });

  it("upserts one routing document per routable status list", async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const database = {
      container: vi.fn().mockReturnValue({
        items: {
          query: vi.fn(),
          upsert,
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListRoutingRepository(database);

    await expect(
      repository.addRoutableStatusListIds([
        "list-a" as NonEmptyString,
        "list-b" as NonEmptyString,
      ]),
    ).resolves.toBeUndefined();

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, { id: "list-a" });
    expect(upsert).toHaveBeenNthCalledWith(2, { id: "list-b" });
  });

  it("deletes one routing document per sealed status list and ignores missing documents", async () => {
    const deleteMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        Object.assign(new Error("not found"), {
          code: 404,
        }),
      );

    const item = vi.fn((id: string, partitionKey: string) => ({
      delete: deleteMock,
      id,
      partitionKey,
    }));

    const database = {
      container: vi.fn().mockReturnValue({
        item,
        items: {
          query: vi.fn(),
          upsert: vi.fn(),
        },
      }),
    } as unknown as Database;

    const repository = new CosmosDbStatusListRoutingRepository(database);

    await expect(
      repository.removeRoutableStatusListIds([
        "list-a" as NonEmptyString,
        "list-b" as NonEmptyString,
      ]),
    ).resolves.toBeUndefined();

    expect(item).toHaveBeenNthCalledWith(1, "list-a", "list-a");
    expect(item).toHaveBeenNthCalledWith(2, "list-b", "list-b");
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });
});
