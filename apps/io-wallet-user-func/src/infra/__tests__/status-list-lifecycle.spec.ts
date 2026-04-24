/* eslint-disable max-lines-per-function */
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { NotificationService } from "io-wallet-common/notification";
import { describe, expect, it, vi } from "vitest";

import {
  StatusListLifecycleCatalogDataSource,
  StatusListLifecyclePagesDataSource,
  StatusListLifecycleRoutingDataSource,
  StatusListLifecycleService,
} from "@/infra/status-list-lifecycle";

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;

  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const waitForNextMacrotask = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

const makeCatalogDataSource = (
  overrides: Partial<StatusListLifecycleCatalogDataSource> = {},
): StatusListLifecycleCatalogDataSource => ({
  closeAlmostFullStatusLists: async () => [],
  createInitializingStatusList: async () => "created-list" as NonEmptyString,
  getCapacitySnapshot: async () => ({
    openStatusListsCount: 0,
    remainingTotalCapacity: 0,
  }),
  listOpenStatusListIds: async () => [],
  listStaleInitializingStatusListIds: async () => [],
  openStatusList: async () => undefined,
  ...overrides,
});

const makePagesDataSource = (
  overrides: Partial<StatusListLifecyclePagesDataSource> = {},
): StatusListLifecyclePagesDataSource => ({
  createEmptyPagesForStatusList: async () => undefined,
  ...overrides,
});

const makeRoutingDataSource = (
  overrides: Partial<StatusListLifecycleRoutingDataSource> = {},
): StatusListLifecycleRoutingDataSource => ({
  addRoutableStatusListIds: async () => undefined,
  getOpenStatusListIds: async () => [],
  removeRoutableStatusListIds: async () => undefined,
  ...overrides,
});

const makeNotificationService = (
  overrides: Partial<NotificationService> = {},
): NotificationService => ({
  sendMessage: () => TE.right(undefined),
  ...overrides,
});

const makeLifecycleService = (
  catalogs: StatusListLifecycleCatalogDataSource,
  pages: StatusListLifecyclePagesDataSource,
  routing: StatusListLifecycleRoutingDataSource,
  notifications: NotificationService = makeNotificationService(),
) =>
  new StatusListLifecycleService(catalogs, pages, routing, notifications, {
    allocationBlockSize: 256,
  });

describe("StatusListLifecycleService", () => {
  it("creates pages before opening and routing each new status list", async () => {
    const createInitializingStatusList = vi
      .fn()
      .mockResolvedValueOnce("list-a" as NonEmptyString)
      .mockResolvedValueOnce("list-b" as NonEmptyString);
    const executionLog: string[] = [];
    const createEmptyPagesForStatusList = vi
      .fn()
      .mockImplementation(async (statusListId: NonEmptyString) => {
        executionLog.push(`pages:${statusListId}`);
      });
    const openStatusList = vi
      .fn()
      .mockImplementation(async (statusListId: NonEmptyString) => {
        executionLog.push(`open:${statusListId}`);
      });
    const addRoutableStatusListIds = vi
      .fn()
      .mockImplementation(async ([statusListId]: readonly NonEmptyString[]) => {
        executionLog.push(`route:${statusListId}`);
      });

    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        createInitializingStatusList,
        openStatusList,
      }),
      makePagesDataSource({ createEmptyPagesForStatusList }),
      makeRoutingDataSource({ addRoutableStatusListIds }),
    );

    await expect(lifecycle.provisionNewStatusLists(2)()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(createInitializingStatusList).toHaveBeenCalledTimes(2);
    expect(createEmptyPagesForStatusList.mock.calls).toEqual(
      expect.arrayContaining([["list-a"], ["list-b"]]),
    );
    expect(openStatusList.mock.calls).toEqual(
      expect.arrayContaining([["list-a"], ["list-b"]]),
    );
    expect(addRoutableStatusListIds.mock.calls).toEqual(
      expect.arrayContaining([[["list-a"]], [["list-b"]]]),
    );

    for (const statusListId of ["list-a", "list-b"]) {
      expect(executionLog.indexOf(`pages:${statusListId}`)).toBeLessThan(
        executionLog.indexOf(`open:${statusListId}`),
      );
      expect(executionLog.indexOf(`open:${statusListId}`)).toBeLessThan(
        executionLog.indexOf(`route:${statusListId}`),
      );
    }
  });

  it("sends a notification after each new status list becomes routable", async () => {
    const addRoutableStatusListIds = vi.fn().mockResolvedValue(undefined);
    const sendMessage = vi.fn().mockReturnValue(TE.right(undefined));

    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        createInitializingStatusList: async () => "list-a" as NonEmptyString,
      }),
      makePagesDataSource(),
      makeRoutingDataSource({ addRoutableStatusListIds }),
      makeNotificationService({ sendMessage }),
    );

    await expect(lifecycle.provisionNewStatusLists(1)()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(sendMessage).toHaveBeenCalledWith("New status list created: list-a");
    expect(addRoutableStatusListIds.mock.invocationCallOrder[0]).toBeLessThan(
      sendMessage.mock.invocationCallOrder[0],
    );
  });

  it("does not fail provisioning when notification delivery fails", async () => {
    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        createInitializingStatusList: async () => "list-a" as NonEmptyString,
      }),
      makePagesDataSource(),
      makeRoutingDataSource(),
      makeNotificationService({
        sendMessage: () => TE.left(new Error("slack unavailable")),
      }),
    );

    await expect(lifecycle.provisionNewStatusLists(1)()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });
  });

  it("provisions new status lists in bounded parallel batches", async () => {
    const deferredStatusListIds = [
      createDeferred<NonEmptyString>(),
      createDeferred<NonEmptyString>(),
      createDeferred<NonEmptyString>(),
      createDeferred<NonEmptyString>(),
      createDeferred<NonEmptyString>(),
    ];
    const pendingDeferredStatusListIds = [...deferredStatusListIds];
    let inFlightCreateCount = 0;
    let maxInFlightCreateCount = 0;
    const createInitializingStatusList = vi.fn().mockImplementation(() => {
      const deferredStatusListId = pendingDeferredStatusListIds.shift();

      if (!deferredStatusListId) {
        throw new Error("missing deferred status list id");
      }

      inFlightCreateCount += 1;
      maxInFlightCreateCount = Math.max(
        maxInFlightCreateCount,
        inFlightCreateCount,
      );

      return deferredStatusListId.promise.finally(() => {
        inFlightCreateCount -= 1;
      });
    });
    const createEmptyPagesForStatusList = vi.fn().mockResolvedValue(undefined);
    const openStatusList = vi.fn().mockResolvedValue(undefined);
    const addRoutableStatusListIds = vi.fn().mockResolvedValue(undefined);

    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        createInitializingStatusList,
        openStatusList,
      }),
      makePagesDataSource({ createEmptyPagesForStatusList }),
      makeRoutingDataSource({ addRoutableStatusListIds }),
    );

    const result = lifecycle.provisionNewStatusLists(5)();

    await Promise.resolve();
    await Promise.resolve();

    expect(createInitializingStatusList).toHaveBeenCalledTimes(4);
    expect(maxInFlightCreateCount).toBe(4);

    ["list-a", "list-b", "list-c", "list-d"].forEach((statusListId, index) => {
      deferredStatusListIds[index].resolve(statusListId as NonEmptyString);
    });

    await waitForNextMacrotask();

    expect(createInitializingStatusList).toHaveBeenCalledTimes(5);

    deferredStatusListIds[4].resolve("list-e" as NonEmptyString);

    await expect(result).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });
  });

  it("removes sealed status lists from routing", async () => {
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockResolvedValue([
        "list-a" as NonEmptyString,
        "list-b" as NonEmptyString,
      ]);
    const removeRoutableStatusListIds = vi.fn().mockResolvedValue(undefined);

    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        closeAlmostFullStatusLists,
      }),
      makePagesDataSource(),
      makeRoutingDataSource({ removeRoutableStatusListIds }),
    );

    await expect(lifecycle.closeAlmostFullStatusLists()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(removeRoutableStatusListIds).toHaveBeenCalledWith([
      "list-a",
      "list-b",
    ]);
    expect(closeAlmostFullStatusLists.mock.invocationCallOrder[0]).toBeLessThan(
      removeRoutableStatusListIds.mock.invocationCallOrder[0],
    );
  });

  it("reconciles stale INITIALIZING lists by ensuring pages, opening, and routing them", async () => {
    const createEmptyPagesForStatusList = vi.fn().mockResolvedValue(undefined);
    const openStatusList = vi.fn().mockResolvedValue(undefined);
    const addRoutableStatusListIds = vi.fn().mockResolvedValue(undefined);

    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        listOpenStatusListIds: async () => ["list-a" as NonEmptyString],
        listStaleInitializingStatusListIds: async () => [
          "list-a" as NonEmptyString,
        ],
        openStatusList,
      }),
      makePagesDataSource({ createEmptyPagesForStatusList }),
      makeRoutingDataSource({
        addRoutableStatusListIds,
      }),
    );

    await expect(lifecycle.reconcileStatusLists()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(createEmptyPagesForStatusList).toHaveBeenCalledWith("list-a");
    expect(openStatusList).toHaveBeenCalledWith("list-a");
    expect(addRoutableStatusListIds).toHaveBeenNthCalledWith(1, ["list-a"]);
    expect(openStatusList.mock.invocationCallOrder[0]).toBeLessThan(
      addRoutableStatusListIds.mock.invocationCallOrder[0],
    );
  });

  it("reconciles routing to match catalog OPEN status lists", async () => {
    const addRoutableStatusListIds = vi.fn().mockResolvedValue(undefined);
    const removeRoutableStatusListIds = vi.fn().mockResolvedValue(undefined);

    const lifecycle = makeLifecycleService(
      makeCatalogDataSource({
        listOpenStatusListIds: async () => [
          "list-a" as NonEmptyString,
          "list-b" as NonEmptyString,
        ],
      }),
      makePagesDataSource(),
      makeRoutingDataSource({
        addRoutableStatusListIds,
        getOpenStatusListIds: async () => [
          "list-b" as NonEmptyString,
          "list-c" as NonEmptyString,
        ],
        removeRoutableStatusListIds,
      }),
    );

    await expect(lifecycle.reconcileStatusLists()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(addRoutableStatusListIds).toHaveBeenCalledWith(["list-a"]);
    expect(removeRoutableStatusListIds).toHaveBeenCalledWith(["list-c"]);
  });
});
