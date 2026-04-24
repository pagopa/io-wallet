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

export interface StatusListLifecycle {
  closeAlmostFullStatusLists: TE.TaskEither<Error, void>;
  getCapacitySnapshot: TE.TaskEither<Error, StatusListsCapacitySnapshot>;
  provisionNewStatusLists: (count: number) => TE.TaskEither<Error, void>;
  reconcileStatusLists: TE.TaskEither<Error, void>;
}

export interface StatusListsCapacitySnapshot {
  openStatusListsCount: number;
  remainingTotalCapacity: number;
}

export const allocateStatusListBinding: RTE.ReaderTaskEither<
  { statusListAllocator: StatusListAllocator },
  Error,
  StatusListBinding
> = ({ statusListAllocator }) => statusListAllocator.allocateStatusBinding;

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
