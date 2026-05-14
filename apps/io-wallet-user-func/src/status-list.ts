import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

export interface StatusListAllocator {
  allocateStatusBinding: TE.TaskEither<Error, StatusListBinding>;
}

export interface StatusListBinding {
  index: number;
  statusListId: NonEmptyString;
}

export interface StatusListBitRevocation {
  revokeBits: (
    statusListBindings: readonly StatusListBinding[],
  ) => TE.TaskEither<Error, void>;
}

export interface StatusListLifecycle {
  closeAlmostFullStatusLists: TE.TaskEither<Error, void>;
  getCapacitySnapshot: TE.TaskEither<Error, StatusListsCapacitySnapshot>;
  provisionNewStatusLists: (count: number) => TE.TaskEither<Error, void>;
  reconcileStatusLists: TE.TaskEither<Error, void>;
}

export interface StatusListPublication {
  listPublishableStatusListIds: TE.TaskEither<Error, readonly NonEmptyString[]>;
  publishInitializingStatusList: (
    statusListId: NonEmptyString,
  ) => TE.TaskEither<Error, void>;
  publishStatusList: (
    statusListId: NonEmptyString,
  ) => TE.TaskEither<Error, void>;
}

export const listPublishableStatusListIds: RTE.ReaderTaskEither<
  { statusListPublication: StatusListPublication },
  Error,
  readonly NonEmptyString[]
> = ({ statusListPublication }) =>
  statusListPublication.listPublishableStatusListIds;

export const publishStatusList =
  (
    statusListId: NonEmptyString,
  ): RTE.ReaderTaskEither<
    { statusListPublication: StatusListPublication },
    Error,
    void
  > =>
  ({ statusListPublication }) =>
    statusListPublication.publishStatusList(statusListId);

export interface StatusListsCapacitySnapshot {
  openStatusListsCount: number;
  remainingTotalCapacity: number;
}

export const allocateStatusListBinding: RTE.ReaderTaskEither<
  { statusListAllocator: StatusListAllocator },
  Error,
  StatusListBinding
> = ({ statusListAllocator }) => statusListAllocator.allocateStatusBinding;

export const revokeBits =
  (
    statusListBindings: readonly StatusListBinding[],
  ): RTE.ReaderTaskEither<
    {
      statusListBitRevocation: StatusListBitRevocation;
    },
    Error,
    void
  > =>
  ({ statusListBitRevocation }) =>
    statusListBitRevocation.revokeBits(statusListBindings);

export const getCapacitySnapshot: RTE.ReaderTaskEither<
  {
    statusListLifecycle: StatusListLifecycle;
  },
  Error,
  StatusListsCapacitySnapshot
> = ({ statusListLifecycle }) => statusListLifecycle.getCapacitySnapshot;

export const closeAlmostFullStatusLists: RTE.ReaderTaskEither<
  {
    statusListLifecycle: StatusListLifecycle;
  },
  Error,
  void
> = ({ statusListLifecycle }) => statusListLifecycle.closeAlmostFullStatusLists;

export const reconcileStatusLists: RTE.ReaderTaskEither<
  {
    statusListLifecycle: StatusListLifecycle;
  },
  Error,
  void
> = ({ statusListLifecycle }) => statusListLifecycle.reconcileStatusLists;

export const provisionNewStatusLists =
  (
    count: number,
  ): RTE.ReaderTaskEither<
    {
      statusListLifecycle: StatusListLifecycle;
    },
    Error,
    void
  > =>
  ({ statusListLifecycle }) =>
    statusListLifecycle.provisionNewStatusLists(count);
