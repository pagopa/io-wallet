/* eslint-disable max-lines-per-function */
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it, vi } from "vitest";

import { StatusListLifecycle } from "@/status-list";

import {
  manageStatusLists,
  type StatusListManagerConfig,
} from "../status-list-manager";

const makeStatusListManagerConfig = (
  overrides: Partial<StatusListManagerConfig> = {},
): StatusListManagerConfig => ({
  capacityPerNewStatusList: 1_000,
  minimumAllocationConflictsForScaleUp: 10,
  minimumRemainingTotalCapacity: 200,
  ...overrides,
});

describe("manageStatusLists", () => {
  it("runs reconciliation before normal close and provision steps", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 0,
        remainingTotalCapacity: 100,
      }),
    );
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 2,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right({
          allocationConflicts: 0,
        }),
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig(),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(1);
    expect(reconcileStatusLists.mock.invocationCallOrder[0]).toBeLessThan(
      closeAlmostFullStatusLists.mock.invocationCallOrder[0],
    );
    expect(closeAlmostFullStatusLists.mock.invocationCallOrder[0]).toBeLessThan(
      provisionNewStatusLists.mock.invocationCallOrder[0],
    );
  });

  it("scales up to the automatic maximum when conflicts are high", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 0,
        remainingTotalCapacity: 3_000,
      }),
    );
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right({
          allocationConflicts: 4,
        }),
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig({
        minimumAllocationConflictsForScaleUp: 4,
      }),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(3);
  });

  it("does not change minimum target when conflict auto scale is disabled", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 0,
        remainingTotalCapacity: 2_000,
      }),
    );
    const getRecentConflictMetrics = vi
      .fn()
      .mockReturnValue(TE.left(new Error("should not be called")));
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: false,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics,
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig(),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(1);
    expect(getRecentConflictMetrics).not.toHaveBeenCalled();
  });

  it("does not query conflict metrics when the policy cannot scale above the minimum", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 0,
        remainingTotalCapacity: 3_000,
      }),
    );
    const getRecentConflictMetrics = vi
      .fn()
      .mockReturnValue(TE.left(new Error("should not be called")));
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 3,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics,
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig(),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(3);
    expect(getRecentConflictMetrics).not.toHaveBeenCalled();
  });

  it("does not scale down automatically when conflicts are low", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 1,
        remainingTotalCapacity: 2_000,
      }),
    );
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right({
          allocationConflicts: 0,
        }),
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig(),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).not.toHaveBeenCalled();
  });

  it("provisions enough new lists to recover missing capacity in one run", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 3,
        remainingTotalCapacity: 750,
      }),
    );
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 2,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right({
          allocationConflicts: 0,
        }),
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig({
        minimumRemainingTotalCapacity: 2_500,
      }),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(2);
  });

  it("does not scale up automatically when conflicts stay below threshold", async () => {
    const reconcileStatusLists = vi.fn().mockReturnValue(TE.right(undefined));
    const closeAlmostFullStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));
    const getCapacitySnapshot = vi.fn().mockReturnValue(
      TE.right({
        openStatusListsCount: 0,
        remainingTotalCapacity: 3_000,
      }),
    );
    const provisionNewStatusLists = vi
      .fn()
      .mockReturnValue(TE.right(undefined));

    const statusListLifecycle: StatusListLifecycle = {
      get closeAlmostFullStatusLists() {
        return closeAlmostFullStatusLists();
      },
      get getCapacitySnapshot() {
        return getCapacitySnapshot();
      },
      provisionNewStatusLists,
      get reconcileStatusLists() {
        return reconcileStatusLists();
      },
    };

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right({
          allocationConflicts: 9,
        }),
      },
      statusListLifecycle,
      statusListManagerConfig: makeStatusListManagerConfig(),
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(1);
  });
});
