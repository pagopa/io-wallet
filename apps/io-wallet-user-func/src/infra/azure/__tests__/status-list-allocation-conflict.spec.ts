import { LogsQueryResultStatus } from "@azure/monitor-query-logs";
import { describe, expect, it, vi } from "vitest";

import { AzureMonitorLogsStatusListAllocationConflictRepository } from "../applicationinsights/status-list-allocation-conflict";

describe("AzureMonitorLogsStatusListAllocationConflictRepository", () => {
  const applicationInsightsResourceId =
    "/subscriptions/test-subscription/resourceGroups/test-rg/providers/microsoft.insights/components/test-appinsights";

  it("queries AppEvents and returns 0 when the query has no rows", async () => {
    const queryResource = vi.fn().mockResolvedValue({
      status: LogsQueryResultStatus.Success,
      tables: [],
    });

    const repository =
      new AzureMonitorLogsStatusListAllocationConflictRepository({
        applicationInsightsResourceId,
        client: {
          queryResource,
        } as never,
      });

    await expect(repository.getRecentConflictMetrics()).resolves.toEqual({
      _tag: "Right",
      right: {
        allocationConflicts: 0,
      },
    });

    expect(queryResource).toHaveBeenCalledWith(
      applicationInsightsResourceId,
      expect.stringContaining("AppEvents"),
      expect.objectContaining({
        duration: "PT15M",
      }),
      expect.objectContaining({
        serverTimeoutInSeconds: 30,
      }),
    );

    expect(queryResource.mock.calls[0][1]).toContain(
      `Name == "StatusListAllocation"`,
    );
    expect(queryResource.mock.calls[0][1]).toContain(
      "summarize allocationConflicts = count()",
    );
    expect(queryResource.mock.calls[0][1]).toContain(
      "project allocationConflicts",
    );
  });

  it("returns allocation conflicts from the query result", async () => {
    const queryResource = vi.fn().mockResolvedValue({
      status: LogsQueryResultStatus.Success,
      tables: [{ rows: [[15]] }],
    });

    const repository =
      new AzureMonitorLogsStatusListAllocationConflictRepository({
        applicationInsightsResourceId,
        client: {
          queryResource,
        } as never,
      });

    await expect(repository.getRecentConflictMetrics()).resolves.toEqual({
      _tag: "Right",
      right: {
        allocationConflicts: 15,
      },
    });
  });

  it("returns a left when Azure Monitor Logs reports a partial failure", async () => {
    const queryResource = vi.fn().mockResolvedValue({
      partialError: new Error("partial failure"),
      status: LogsQueryResultStatus.PartialFailure,
      tables: [],
    });

    const repository =
      new AzureMonitorLogsStatusListAllocationConflictRepository({
        applicationInsightsResourceId,
        client: {
          queryResource,
        } as never,
      });

    await expect(repository.getRecentConflictMetrics()).resolves.toEqual({
      _tag: "Left",
      left: new Error(
        "Azure Monitor Logs query for the Application Insights resource partially failed: partial failure",
      ),
    });
  });

  it("throws when the query returns a non-finite conflict count", async () => {
    const queryResource = vi.fn().mockResolvedValue({
      status: LogsQueryResultStatus.Success,
      tables: [{ rows: [["NaN"]] }],
    });

    const repository =
      new AzureMonitorLogsStatusListAllocationConflictRepository({
        applicationInsightsResourceId,
        client: {
          queryResource,
        } as never,
      });

    await expect(repository.getRecentConflictMetrics()).rejects.toThrow(
      "Application Insights query returned an invalid allocationConflicts",
    );
  });
});
