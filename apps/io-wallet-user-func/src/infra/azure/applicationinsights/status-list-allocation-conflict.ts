import {
  LogsQueryClient,
  LogsQueryResultStatus,
  LogsTable,
} from "@azure/monitor-query-logs";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import type {
  StatusListAllocationConflictMetrics,
  StatusListAllocationConflictRepository,
} from "@/use-cases/status-list-manager";

const parseNumericMetric = (metricName: string, rawValue: unknown) => {
  if (rawValue === undefined) {
    return 0;
  }

  const numericValue =
    typeof rawValue === "number" ? rawValue : Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw new Error(
      `Application Insights query returned an invalid ${metricName}`,
    );
  }

  return numericValue;
};

const getConflictMetricsFromTables = (
  tables: LogsTable[],
): StatusListAllocationConflictMetrics => {
  if (tables.length === 0 || tables[0].rows.length === 0) {
    return {
      allocationConflicts: 0,
    };
  }

  const [rawAllocationConflicts] = tables[0].rows[0];

  return {
    allocationConflicts: parseNumericMetric(
      "allocationConflicts",
      rawAllocationConflicts,
    ),
  };
};

export class AzureMonitorLogsStatusListAllocationConflictRepository implements StatusListAllocationConflictRepository {
  readonly #applicationInsightsResourceId: string;
  readonly #client: LogsQueryClient;

  readonly #query = `AppEvents | where Name == "StatusListAllocation" | summarize allocationConflicts = count() | project allocationConflicts`;

  getRecentConflictMetrics = pipe(
    TE.tryCatch(
      () =>
        this.#client.queryResource(
          this.#applicationInsightsResourceId,
          this.#query,
          {
            duration: "PT15M",
          },
          {
            serverTimeoutInSeconds: 30,
          },
        ),
      (error) =>
        error instanceof Error
          ? error
          : new Error(
              `Error querying Azure Monitor Logs for the Application Insights resource: ${String(error)}`,
            ),
    ),
    TE.chainW((result) =>
      result.status === LogsQueryResultStatus.PartialFailure
        ? TE.left(
            new Error(
              `Azure Monitor Logs query for the Application Insights resource partially failed: ${result.partialError.message}`,
            ),
          )
        : TE.right(getConflictMetricsFromTables(result.tables)),
    ),
  );

  constructor({
    applicationInsightsResourceId,
    client,
  }: {
    applicationInsightsResourceId: string;
    client: LogsQueryClient;
  }) {
    this.#applicationInsightsResourceId = applicationInsightsResourceId;
    this.#client = client;
  }
}
