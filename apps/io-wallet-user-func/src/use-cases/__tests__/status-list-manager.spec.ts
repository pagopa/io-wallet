/* eslint-disable max-lines-per-function */
import * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StatusListLifecycle } from "@/status-list";

import { manageStatusLists } from "../status-list-manager";

const statusListManagerConfig = {
  capacityPerNewStatusList: 1000,
  minimumAllocationConflictsForScaleUp: 4,
  minimumRemainingTotalCapacity: 200,
};

const reconcileStatusLists = vi.fn(() => TE.right(undefined));
const closeAlmostFullStatusLists = vi.fn(() => TE.right(undefined));
const getCapacitySnapshot = vi.fn(() =>
  TE.right({
    openStatusListsCount: 1,
    remainingTotalCapacity: 300,
  }),
);
const provisionNewStatusLists = vi.fn(() => TE.right(undefined));

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

const openStatusListsPolicyRepository = {
  loadOpenStatusListsPolicy: TE.right({
    automaticMaximumOpenStatusLists: 3,
    conflictAutoScaleEnabled: true,
    minimumOpenStatusLists: 1,
  }),
};
const getRecentConflictMetrics = vi.fn(TE.right(4));

const statusListAllocationConflictRepository = {
  getRecentConflictMetrics,
};

describe("manageStatusLists", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("runs reconciliation before normal close and provision steps and scales up to the automatic maximum when conflicts are high", async () => {
    const handler = manageStatusLists({
      openStatusListsPolicyRepository,
      statusListAllocationConflictRepository,
      statusListLifecycle,
      statusListManagerConfig,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(2);
    expect(reconcileStatusLists.mock.invocationCallOrder[0]).toBeLessThan(
      closeAlmostFullStatusLists.mock.invocationCallOrder[0],
    );
    expect(closeAlmostFullStatusLists.mock.invocationCallOrder[0]).toBeLessThan(
      provisionNewStatusLists.mock.invocationCallOrder[0],
    );
  });

  it("does not change minimum target when conflict auto scale is disabled", async () => {
    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: false,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository,
      statusListLifecycle,
      statusListManagerConfig,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).not.toHaveBeenCalled();
    expect(getRecentConflictMetrics).not.toHaveBeenCalled();
  });

  it("does not query conflict metrics when the policy cannot scale above the minimum", async () => {
    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 3,
        }),
      },
      statusListAllocationConflictRepository,
      statusListLifecycle,
      statusListManagerConfig,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).toHaveBeenCalledWith(2);
    expect(getRecentConflictMetrics).not.toHaveBeenCalled();
  });

  it("does not scale down automatically when conflicts are low", async () => {
    const handler = manageStatusLists({
      openStatusListsPolicyRepository,
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right(0),
      },
      statusListLifecycle,
      statusListManagerConfig,
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
    getCapacitySnapshot.mockReturnValue(
      TE.right({
        openStatusListsCount: 3,
        remainingTotalCapacity: 750,
      }),
    );

    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 2,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right(0),
      },
      statusListLifecycle,
      statusListManagerConfig: {
        ...statusListManagerConfig,
        minimumRemainingTotalCapacity: 2500,
      },
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
    const handler = manageStatusLists({
      openStatusListsPolicyRepository: {
        loadOpenStatusListsPolicy: TE.right({
          automaticMaximumOpenStatusLists: 3,
          conflictAutoScaleEnabled: true,
          minimumOpenStatusLists: 1,
        }),
      },
      statusListAllocationConflictRepository: {
        getRecentConflictMetrics: TE.right(3),
      },
      statusListLifecycle,
      statusListManagerConfig,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });

    expect(reconcileStatusLists).toHaveBeenCalledTimes(1);
    expect(closeAlmostFullStatusLists).toHaveBeenCalledTimes(1);
    expect(provisionNewStatusLists).not.toHaveBeenCalled();
  });
});
