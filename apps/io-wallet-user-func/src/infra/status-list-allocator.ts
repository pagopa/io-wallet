import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";

import { StatusListAllocator, StatusListBinding } from "@/status-list";

import { sendTelemetryCustomEvent } from "./telemetry";

export interface StatusListAllocatorCatalogDataSource {
  reserveNextBlock: (
    statusListId: NonEmptyString,
    blockSize: number,
  ) => Promise<number | undefined>;
}

export interface StatusListAllocatorRoutingDataSource {
  getOpenStatusListIds: () => Promise<readonly NonEmptyString[]>;
}

interface CachedReservedStatusListBlock {
  endExclusive: number;
  nextIdx: number;
  statusListId: NonEmptyString;
}

interface StatusListAllocationCache {
  reservedBlock: CachedReservedStatusListBlock | undefined;
}

interface StatusListAllocatorConfig {
  blockSize: number;
}

export class StatusListAllocationConflictError extends Error {
  name = "StatusListAllocationConflictError";

  constructor(statusListId: string) {
    super(`Status list allocation conflict on ${statusListId}`);
  }
}

const statusListAllocatorDefaultMaxRetries = 5;
const statusListAllocatorDefaultRetryDelayMs = 25;

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const randomizeStartStatusListIds = (
  statusListIds: readonly NonEmptyString[],
): readonly NonEmptyString[] => {
  if (statusListIds.length <= 1) {
    return statusListIds;
  }

  const startIdx = Math.floor(Math.random() * statusListIds.length);

  return [
    ...statusListIds.slice(startIdx),
    ...statusListIds.slice(0, startIdx),
  ];
};

export class StatusListAllocatorService implements StatusListAllocator {
  readonly allocateStatusBinding = TE.tryCatch(
    () => this.allocateStatusBindingInternal(),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );

  constructor(
    private readonly catalogs: StatusListAllocatorCatalogDataSource,
    private readonly routing: StatusListAllocatorRoutingDataSource,
    private readonly cache: StatusListAllocationCache,
    private readonly config: StatusListAllocatorConfig,
  ) {}

  private allocateFromCache(): StatusListBinding | undefined {
    const reservedBlock = this.cache.reservedBlock;

    if (!reservedBlock || reservedBlock.nextIdx >= reservedBlock.endExclusive) {
      this.cache.reservedBlock = undefined;
      return undefined;
    }

    const statusBinding = {
      index: reservedBlock.nextIdx,
      statusListId: reservedBlock.statusListId,
    };

    reservedBlock.nextIdx += 1;

    if (reservedBlock.nextIdx >= reservedBlock.endExclusive) {
      this.cache.reservedBlock = undefined;
    }

    return statusBinding;
  }

  private async allocateStatusBindingInternal() {
    const cachedBinding = this.allocateFromCache();

    if (cachedBinding) {
      return cachedBinding;
    }

    for (
      let attempt = 0;
      attempt <= statusListAllocatorDefaultMaxRetries;
      attempt += 1
    ) {
      const openStatusListIds = await this.routing.getOpenStatusListIds();

      const { allocatedBinding, hadConflict } =
        await this.scanOpenStatusListIds(
          randomizeStartStatusListIds(openStatusListIds),
        );

      // We found a free block in one of the OPEN lists.
      if (allocatedBinding) {
        return allocatedBinding;
      }

      // No conflict means retrying would scan the same state again.
      if (!hadConflict) {
        break;
      }

      // Back off only when a concurrent conflict makes a retry meaningful.
      if (attempt < statusListAllocatorDefaultMaxRetries) {
        await delay(
          statusListAllocatorDefaultRetryDelayMs * Math.max(1, attempt + 1),
        );
      }
    }

    throw new Error("No OPEN status lists available for allocation");
  }

  private async scanOpenStatusListIds(
    statusListIds: readonly NonEmptyString[],
  ) {
    let hadConflict = false;

    for (const statusListId of statusListIds) {
      try {
        const allocatedBinding = await this.tryReserveNextBlock(statusListId);

        if (allocatedBinding) {
          return { allocatedBinding, hadConflict };
        }
      } catch (error) {
        if (error instanceof StatusListAllocationConflictError) {
          sendTelemetryCustomEvent({
            name: "StatusListAllocation",
            properties: {
              operation: "reserveNextBlockConflict",
            },
          });
          hadConflict = true;
          continue;
        }

        throw error;
      }
    }

    return { allocatedBinding: undefined, hadConflict };
  }

  private storeReservedBlockAndAllocate(
    startIdx: number,
    statusListId: NonEmptyString,
  ): StatusListBinding {
    this.cache.reservedBlock = {
      endExclusive: startIdx + this.config.blockSize,
      nextIdx: startIdx + 1,
      statusListId,
    };

    if (
      this.cache.reservedBlock.nextIdx >= this.cache.reservedBlock.endExclusive
    ) {
      this.cache.reservedBlock = undefined;
    }

    return {
      index: startIdx,
      statusListId,
    };
  }

  private async tryReserveNextBlock(statusListId: NonEmptyString) {
    const reservedStartIdx = await this.catalogs.reserveNextBlock(
      statusListId,
      this.config.blockSize,
    );

    // Undefined means this OPEN list cannot allocate now, so the caller keeps
    // scanning the remaining OPEN lists instead of failing the whole allocation.
    if (reservedStartIdx === undefined) {
      return undefined;
    }

    return this.storeReservedBlockAndAllocate(reservedStartIdx, statusListId);
  }
}
