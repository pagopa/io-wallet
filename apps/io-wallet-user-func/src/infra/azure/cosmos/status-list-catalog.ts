import { Container, Database } from "@azure/cosmos";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  CosmosPreconditionFailedError,
  InvalidCosmosResourceError,
  toCosmosError,
  toCosmosErrorOrInvalidResource,
} from "@/infra/azure/cosmos/errors";
import {
  StatusListAllocationConflictError,
  StatusListAllocatorCatalogDataSource,
} from "@/infra/status-list-allocator";
import { StatusListLifecycleCatalogDataSource } from "@/infra/status-list-lifecycle";
import { StatusListsCapacitySnapshot } from "@/status-list";

const nonEmptyStringSchema = z
  .string()
  .min(1)
  .transform((value) => value as NonEmptyString);

const isoDateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)));

const statusListCatalogStateSchema = z.enum([
  "INITIALIZING",
  "OPEN",
  "SEALED",
  "RETIRED",
]);

const statusListCatalogDocumentSchema = z.object({
  capacityBits: z.number(),
  id: nonEmptyStringSchema,
  initializedAt: isoDateStringSchema,
  nextFreeIndex: z.number(),
  openedAt: isoDateStringSchema.optional(),
  retiredAt: isoDateStringSchema.optional(),
  sealedAt: isoDateStringSchema.optional(),
  state: statusListCatalogStateSchema,
});

const getStateTransitionPatchOperations = (
  nextState: "OPEN" | "RETIRED" | "SEALED",
  occurredAt: string,
) => {
  const timestampFieldByState = {
    OPEN: "openedAt",
    RETIRED: "retiredAt",
    SEALED: "sealedAt",
  } as const;

  return [
    {
      op: "set" as const,
      path: "/state",
      value: nextState,
    },
    {
      op: "set" as const,
      path: `/${timestampFieldByState[nextState]}`,
      value: occurredAt,
    },
  ];
};

const statusListIdsSchema = z
  .array(
    z.object({
      id: nonEmptyStringSchema,
    }),
  )
  .transform((documents) => documents.map(({ id }) => id));

const capacitySnapshotRowSchema = z
  .object({
    openStatusListsCount: z.number(),
    remainingTotalCapacity: z.number().nullish(),
  })
  .transform(
    ({ openStatusListsCount, remainingTotalCapacity }) =>
      ({
        openStatusListsCount,
        remainingTotalCapacity: remainingTotalCapacity ?? 0,
      }) satisfies StatusListsCapacitySnapshot,
  );

const capacitySnapshotSchema = z.array(capacitySnapshotRowSchema).transform(
  (snapshots) =>
    snapshots[0] ?? {
      openStatusListsCount: 0,
      remainingTotalCapacity: 0,
    },
);

const staleInitializingStatusListsPageSize = 50;

const parseWithSchema = <T>(
  schema: z.ZodType<T>,
  resource: unknown,
  errorMessage: string,
): T => {
  const parsedResource = schema.safeParse(resource);

  if (!parsedResource.success) {
    throw new InvalidCosmosResourceError(errorMessage);
  }

  return parsedResource.data;
};

const parseStatusListIds = (
  resources: unknown,
  errorMessage: string,
): readonly NonEmptyString[] =>
  parseWithSchema(statusListIdsSchema, resources, errorMessage);

export class CosmosDbStatusListCatalogRepository
  implements
    StatusListAllocatorCatalogDataSource,
    StatusListLifecycleCatalogDataSource
{
  #capacityBits: number;

  readonly #container: Container;

  #pageCount: number;

  constructor(db: Database, pageCount: number, pageBitsSize: number) {
    this.#container = db.container("status-list-catalogs");
    this.#pageCount = pageCount;
    this.#capacityBits = pageCount * pageBitsSize;
  }

  readonly closeAlmostFullStatusLists = async (allocationChunkSize: number) => {
    const { resources } = await this.#container.items
      .query({
        parameters: [
          {
            name: "@allocationChunkSize",
            value: allocationChunkSize,
          },
          {
            name: "@openState",
            value: "OPEN",
          },
        ],
        query:
          "SELECT c.id FROM c WHERE c.state = @openState AND c.nextFreeIndex > (c.capacityBits - @allocationChunkSize)",
      })
      .fetchAll()
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource(
          "Error listing closable status lists",
        )(error);
      });

    const closableStatusListIds = parseStatusListIds(
      resources,
      "Error listing closable status lists: invalid result format",
    );

    if (closableStatusListIds.length === 0) {
      return [];
    }

    await this.#closeStatusLists(
      closableStatusListIds,
      allocationChunkSize,
    ).catch((error) => {
      throw toCosmosErrorOrInvalidResource(
        "Error closing almost full status lists",
      )(error);
    });

    return closableStatusListIds;
  };

  readonly createInitializingStatusList = () =>
    this.#createInitializingStatusList().catch((error) => {
      throw toCosmosErrorOrInvalidResource(
        "Error creating initializing status list",
      )(error);
    });

  readonly getCapacitySnapshot = async () => {
    const { resources } = await this.#container.items
      .query({
        parameters: [
          {
            name: "@openState",
            value: "OPEN",
          },
        ],
        query:
          "SELECT COUNT(1) AS openStatusListsCount, SUM(c.capacityBits-c.nextFreeIndex) AS remainingTotalCapacity FROM c WHERE c.state = @openState",
      })
      .fetchAll()
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource(
          "Error getting status list capacity snapshot",
        )(error);
      });

    return parseWithSchema(
      capacitySnapshotSchema,
      resources,
      "Error decoding open status lists: invalid result format",
    );
  };

  readonly listOpenStatusListIds = async () => {
    const { resources } = await this.#container.items
      .query({
        parameters: [
          {
            name: "@openState",
            value: "OPEN",
          },
        ],
        query:
          "SELECT c.id FROM c WHERE c.state = @openState ORDER BY c.id ASC",
      })
      .fetchAll()
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource("Error listing OPEN status lists")(
          error,
        );
      });

    return parseStatusListIds(
      resources,
      "Error listing OPEN status lists: invalid result format",
    );
  };

  readonly listStaleInitializingStatusListIds = async (
    initializedBefore: Date,
  ) => {
    const { resources } = await this.#container.items
      .query(
        {
          parameters: [
            {
              name: "@initializedBefore",
              value: initializedBefore.toISOString(),
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
          maxItemCount: staleInitializingStatusListsPageSize,
        },
      )
      .fetchNext()
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource(
          "Error listing stale INITIALIZING status lists",
        )(error);
      });

    return parseStatusListIds(
      resources,
      "Error listing stale INITIALIZING status lists: invalid result format",
    );
  };

  readonly openStatusList = async (statusListId: NonEmptyString) => {
    const openedAtIsoString = new Date().toISOString();

    await this.#container
      .item(statusListId, statusListId)
      .patch({
        condition: "from c where c.state = 'INITIALIZING'",
        operations: getStateTransitionPatchOperations(
          "OPEN",
          openedAtIsoString,
        ),
      })
      .catch((error) => {
        const mappedError = toCosmosError("Error opening status list")(error);

        if (mappedError instanceof CosmosPreconditionFailedError) {
          return;
        }

        throw mappedError;
      });
  };

  readonly reserveNextBlock = async (
    statusListId: NonEmptyString,
    blockSize: number,
  ) => {
    const { etag, resource } = await this.#container
      .item(statusListId, statusListId)
      .read();

    const document = parseWithSchema(
      statusListCatalogDocumentSchema,
      resource,
      "Error reserving status list block: invalid result format",
    );

    if (
      document.state !== "OPEN" ||
      document.nextFreeIndex + blockSize > document.capacityBits
    ) {
      return undefined;
    }

    try {
      await this.#container.item(statusListId, statusListId).patch(
        [
          {
            op: "set",
            path: "/nextFreeIndex",
            value: document.nextFreeIndex + blockSize,
          },
        ],
        {
          accessCondition: {
            condition: etag,
            type: "IfMatch",
          },
        },
      );
    } catch (error) {
      const mappedError = toCosmosError("Error reserving status list block")(
        error,
      );

      if (mappedError instanceof CosmosPreconditionFailedError) {
        throw new StatusListAllocationConflictError(statusListId);
      }

      throw mappedError;
    }

    return document.nextFreeIndex;
  };

  async #closeStatusLists(
    statusListIds: readonly NonEmptyString[],
    allocationChunkSize: number,
  ): Promise<void> {
    const sealedAtIsoString = new Date().toISOString();
    const closeStatusListOperations = statusListIds.map((statusListId) => ({
      id: statusListId,
      operationType: "Patch" as const,
      partitionKey: statusListId,
      resourceBody: {
        condition: `from c where c.nextFreeIndex > (c.capacityBits - ${allocationChunkSize}) AND c.state = 'OPEN'`,
        operations: getStateTransitionPatchOperations(
          "SEALED",
          sealedAtIsoString,
        ),
      },
    }));

    const results = await this.#container.items.executeBulkOperations(
      closeStatusListOperations,
    );

    for (const { error } of results) {
      if (error === undefined) {
        continue;
      }

      // Ignore benign races where the list disappeared or another instance already sealed it.
      if (error.code === 404 || error.code === 412) {
        continue;
      }

      throw error;
    }
  }

  async #createInitializingStatusList(): Promise<NonEmptyString> {
    const id = randomUUID() as NonEmptyString;

    await this.#container.items.create({
      capacityBits: this.#capacityBits,
      id,
      initializedAt: new Date().toISOString(),
      nextFreeIndex: 0,
      pageCount: this.#pageCount,
      state: "INITIALIZING",
    });

    return id;
  }
}
