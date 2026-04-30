import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import {
  closeAlmostFullStatusLists,
  getCapacitySnapshot,
  provisionNewStatusLists,
  reconcileStatusLists,
  StatusListLifecycle,
  StatusListsCapacitySnapshot,
} from "@/status-list";

export interface OpenStatusListsPolicy {
  automaticMaximumOpenStatusLists: number;
  conflictAutoScaleEnabled: boolean;
  minimumOpenStatusLists: number;
}

export interface OpenStatusListsPolicyRepository {
  loadOpenStatusListsPolicy: TE.TaskEither<Error, OpenStatusListsPolicy>;
}

export interface StatusListAllocationConflictMetrics {
  allocationConflicts: number;
}

export interface StatusListAllocationConflictRepository {
  getRecentConflictMetrics: TE.TaskEither<
    Error,
    StatusListAllocationConflictMetrics
  >;
}

export interface StatusListManagerConfig {
  capacityPerNewStatusList: number;
  minimumAllocationConflictsForScaleUp: number;
  minimumRemainingTotalCapacity: number;
}

interface StatusListManagerEnvironment {
  openStatusListsPolicyRepository: OpenStatusListsPolicyRepository;
  statusListAllocationConflictRepository: StatusListAllocationConflictRepository;
  statusListLifecycle: StatusListLifecycle;
  statusListManagerConfig: StatusListManagerConfig;
}

const loadOpenStatusListsPolicy: RTE.ReaderTaskEither<
  Pick<StatusListManagerEnvironment, "openStatusListsPolicyRepository">,
  Error,
  OpenStatusListsPolicy
> = ({ openStatusListsPolicyRepository }) =>
  openStatusListsPolicyRepository.loadOpenStatusListsPolicy;

const getRecentConflictMetrics: RTE.ReaderTaskEither<
  Pick<StatusListManagerEnvironment, "statusListAllocationConflictRepository">,
  Error,
  StatusListAllocationConflictMetrics
> = ({ statusListAllocationConflictRepository }) =>
  statusListAllocationConflictRepository.getRecentConflictMetrics;

const shouldCheckRecentConflictMetrics = ({
  automaticMaximumOpenStatusLists,
  conflictAutoScaleEnabled,
  minimumOpenStatusLists,
}: OpenStatusListsPolicy) =>
  conflictAutoScaleEnabled &&
  minimumOpenStatusLists < automaticMaximumOpenStatusLists;

const getEffectiveTargetOpenStatusLists = ({
  currentPolicy,
  minimumAllocationConflictsForScaleUp,
  recentConflictMetrics,
}: {
  currentPolicy: OpenStatusListsPolicy;
  minimumAllocationConflictsForScaleUp: number;
  recentConflictMetrics: StatusListAllocationConflictMetrics;
}) =>
  shouldCheckRecentConflictMetrics(currentPolicy) &&
  recentConflictMetrics.allocationConflicts >=
    minimumAllocationConflictsForScaleUp
    ? currentPolicy.automaticMaximumOpenStatusLists
    : currentPolicy.minimumOpenStatusLists;

const loadEffectiveTargetOpenStatusLists: RTE.ReaderTaskEither<
  StatusListManagerEnvironment,
  Error,
  number
> = (environment) =>
  pipe(
    environment,
    loadOpenStatusListsPolicy,
    TE.chain((currentPolicy) =>
      !shouldCheckRecentConflictMetrics(currentPolicy)
        ? TE.right(currentPolicy.minimumOpenStatusLists)
        : pipe(
            environment,
            getRecentConflictMetrics,
            TE.map((recentConflictMetrics) =>
              getEffectiveTargetOpenStatusLists({
                currentPolicy,
                minimumAllocationConflictsForScaleUp:
                  environment.statusListManagerConfig
                    .minimumAllocationConflictsForScaleUp,
                recentConflictMetrics,
              }),
            ),
          ),
    ),
  );

const computeStatusListsToProvisionCount = (
  { openStatusListsCount, remainingTotalCapacity }: StatusListsCapacitySnapshot,
  targetOpenStatusLists: number,
  {
    capacityPerNewStatusList,
    minimumRemainingTotalCapacity,
  }: StatusListManagerConfig,
): number => {
  const listsNeededForFloor = Math.max(
    targetOpenStatusLists - openStatusListsCount,
    0,
  );
  const missingCapacity = Math.max(
    minimumRemainingTotalCapacity - remainingTotalCapacity,
    0,
  );
  const listsNeededForCapacity = Math.ceil(
    missingCapacity / capacityPerNewStatusList,
  );

  return Math.max(listsNeededForFloor, listsNeededForCapacity);
};

const loadStatusListsToProvision: RTE.ReaderTaskEither<
  StatusListManagerEnvironment,
  Error,
  number
> = (environment) =>
  pipe(
    environment,
    loadEffectiveTargetOpenStatusLists,
    TE.bindTo("targetOpenStatusLists"),
    TE.bindW("capacitySnapshot", () => getCapacitySnapshot(environment)),
    TE.map(({ capacitySnapshot, targetOpenStatusLists }) =>
      computeStatusListsToProvisionCount(
        capacitySnapshot,
        targetOpenStatusLists,
        environment.statusListManagerConfig,
      ),
    ),
  );

const ensureTargetOpenStatusLists: RTE.ReaderTaskEither<
  StatusListManagerEnvironment,
  Error,
  void
> = pipe(
  loadStatusListsToProvision,
  RTE.chain((count) =>
    count > 0 ? provisionNewStatusLists(count) : RTE.right(undefined),
  ),
);

export const manageStatusLists: RTE.ReaderTaskEither<
  StatusListManagerEnvironment,
  Error,
  void
> = pipe(
  reconcileStatusLists,
  RTE.chain(() => closeAlmostFullStatusLists),
  RTE.chain(() => ensureTargetOpenStatusLists),
);
