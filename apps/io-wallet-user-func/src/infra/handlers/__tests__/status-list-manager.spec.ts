import * as L from "@pagopa/logger";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const telemetryMocks = vi.hoisted(() => ({
  sendTelemetryException: vi.fn(),
  sendTelemetryExceptionEffect: vi.fn<(_error: Error) => E.Either<Error, void>>(
    () => E.right(undefined),
  ),
}));

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryException: (properties?: Record<string, unknown>) => {
    telemetryMocks.sendTelemetryException(properties);

    return (error: Error) => telemetryMocks.sendTelemetryExceptionEffect(error);
  },
}));

import { StatusListLifecycle } from "@/status-list";

import { StatusListManagerHandler } from "../status-list-manager";

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const makeStatusListLifecycle = (
  reconcileStatusLists: TE.TaskEither<Error, void>,
): StatusListLifecycle => ({
  closeAlmostFullStatusLists: TE.right(undefined),
  getCapacitySnapshot: TE.right({
    openStatusListsCount: 1,
    remainingTotalCapacity: 1_000,
  }),
  provisionNewStatusLists: () => TE.right(undefined),
  reconcileStatusLists,
});

describe("StatusListManagerHandler", () => {
  beforeEach(() => {
    telemetryMocks.sendTelemetryException.mockClear();
    telemetryMocks.sendTelemetryExceptionEffect.mockClear();
    telemetryMocks.sendTelemetryExceptionEffect.mockReturnValue(
      E.right(undefined),
    );
  });

  it("preserves the original manager error when telemetry emission fails", async () => {
    const originalError = new Error("reconcile failed");
    const telemetryError = new Error("telemetry failed");

    telemetryMocks.sendTelemetryExceptionEffect.mockReturnValue(
      E.left(telemetryError),
    );

    await expect(
      StatusListManagerHandler({
        input: undefined,
        inputDecoder: t.unknown,
        logger,
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
        statusListLifecycle: makeStatusListLifecycle(TE.left(originalError)),
        statusListManagerConfig: {
          capacityPerNewStatusList: 1_000,
          minimumAllocationConflictsForScaleUp: 10,
          minimumRemainingTotalCapacity: 200,
        },
      })(),
    ).resolves.toEqual({
      _tag: "Left",
      left: originalError,
    });

    expect(telemetryMocks.sendTelemetryException).toHaveBeenCalledWith({
      functionName: "StatusListManager",
    });
    expect(telemetryMocks.sendTelemetryExceptionEffect).toHaveBeenCalledWith(
      originalError,
    );
  });
});
