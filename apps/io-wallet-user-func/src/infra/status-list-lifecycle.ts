import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { NotificationService } from "io-wallet-common/notification";

import {
  StatusListLifecycle,
  StatusListsCapacitySnapshot,
} from "@/status-list";

export interface StatusListLifecycleCatalogDataSource {
  closeAlmostFullStatusLists: (
    allocationBlockSize: number,
  ) => Promise<readonly NonEmptyString[]>;
  createInitializingStatusList: () => Promise<NonEmptyString>;
  getCapacitySnapshot: () => Promise<StatusListsCapacitySnapshot>;
  listOpenStatusListIds: () => Promise<readonly NonEmptyString[]>;
  listStaleInitializingStatusListIds: (
    initializedBefore: Date,
  ) => Promise<readonly NonEmptyString[]>;
  openStatusList: (statusListId: NonEmptyString) => Promise<void>;
}

export interface StatusListLifecyclePagesDataSource {
  createEmptyPagesForStatusList: (
    statusListId: NonEmptyString,
  ) => Promise<void>;
}

export interface StatusListLifecycleRoutingDataSource {
  addRoutableStatusListIds: (
    statusListIds: readonly NonEmptyString[],
  ) => Promise<void>;
  getOpenStatusListIds: () => Promise<readonly NonEmptyString[]>;
  removeRoutableStatusListIds: (
    statusListIds: readonly NonEmptyString[],
  ) => Promise<void>;
}

interface StatusListLifecycleConfig {
  allocationBlockSize: number;
}

const getMissingIds = (
  expectedIds: readonly NonEmptyString[],
  actualIds: readonly NonEmptyString[],
): readonly NonEmptyString[] => {
  const actualIdsSet = new Set(actualIds);

  return expectedIds.filter((id) => !actualIdsSet.has(id));
};

const provisionBatchSize = 4;
const staleInitializingMaxAgeMs = 10 * 60_000;

export class StatusListLifecycleService implements StatusListLifecycle {
  readonly closeAlmostFullStatusLists = TE.tryCatch(
    async () => {
      const sealedStatusListIds =
        await this.catalogs.closeAlmostFullStatusLists(
          this.config.allocationBlockSize,
        );

      if (sealedStatusListIds.length === 0) {
        return undefined;
      }

      // Catalog is the source of truth: only after lists are SEALED there do we
      // remove their routing entries.
      await this.routing.removeRoutableStatusListIds(sealedStatusListIds);
    },
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );

  readonly getCapacitySnapshot = TE.tryCatch(
    () => this.catalogs.getCapacitySnapshot(),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );

  // Heals drift between catalog and routing: it completes stale INITIALIZING
  // lists and then makes routing match the catalog OPEN state.
  readonly reconcileStatusLists = TE.tryCatch(
    async () => {
      const staleInitializingStatusListIds =
        await this.catalogs.listStaleInitializingStatusListIds(
          new Date(Date.now() - staleInitializingMaxAgeMs),
        );

      for (const statusListId of staleInitializingStatusListIds) {
        await this.pages.createEmptyPagesForStatusList(statusListId);

        await this.catalogs.openStatusList(statusListId);

        // Routing is just a projection of the OPEN state stored in catalog.
        await this.routing.addRoutableStatusListIds([statusListId]);
      }

      const catalogOpenStatusListIds =
        await this.catalogs.listOpenStatusListIds();

      const routingOpenStatusListIds =
        await this.routing.getOpenStatusListIds();

      // Catalog is authoritative for which lists are OPEN. Routing is reconciled
      // to match it for allocation.
      const missingRoutingStatusListIds = getMissingIds(
        catalogOpenStatusListIds,
        routingOpenStatusListIds,
      );

      if (missingRoutingStatusListIds.length > 0) {
        await this.routing.addRoutableStatusListIds(
          missingRoutingStatusListIds,
        );
      }

      const staleRoutingStatusListIds = getMissingIds(
        routingOpenStatusListIds,
        catalogOpenStatusListIds,
      );

      if (staleRoutingStatusListIds.length > 0) {
        await this.routing.removeRoutableStatusListIds(
          staleRoutingStatusListIds,
        );
      }
    },
    (error) => (error instanceof Error ? error : new Error(String(error))),
  );

  constructor(
    private readonly catalogs: StatusListLifecycleCatalogDataSource,
    private readonly pages: StatusListLifecyclePagesDataSource,
    private readonly routing: StatusListLifecycleRoutingDataSource,
    private readonly notifications: NotificationService,
    private readonly config: StatusListLifecycleConfig,
  ) {}

  readonly provisionNewStatusLists = (
    count: number,
  ): TE.TaskEither<Error, void> =>
    count <= 0
      ? TE.right(undefined)
      : TE.tryCatch(
          async () => {
            for (let index = 0; index < count; index += provisionBatchSize) {
              const currentBatchSize = Math.min(
                provisionBatchSize,
                count - index,
              );

              await Promise.all(
                Array.from({ length: currentBatchSize }, () =>
                  this.provisionStatusList(),
                ),
              );
            }
          },
          (error) =>
            error instanceof Error ? error : new Error(String(error)),
        );

  private readonly provisionStatusList = async () => {
    const statusListId = await this.catalogs.createInitializingStatusList();

    await this.pages.createEmptyPagesForStatusList(statusListId);

    await this.catalogs.openStatusList(statusListId);

    // New lists become routable only after catalog marks them OPEN.
    await this.routing.addRoutableStatusListIds([statusListId]);

    await this.notifications.sendMessage(
      `New status list created: ${statusListId}`,
    )();
  };
}
