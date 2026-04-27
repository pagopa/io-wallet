import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { WalletInstance } from "io-wallet-common/wallet-instance";

import { InvalidCosmosResourceError } from "@/infra/azure/cosmos/errors";
import { sendTelemetryException } from "@/infra/telemetry";

interface WalletInstanceCopyProcessingFailure {
  error: Error;
  telemetryProperties: Record<string, unknown>;
}

type WalletInstanceCopyProcessingResult =
  | {
      failure: WalletInstanceCopyProcessingFailure;
      kind: "failure";
    }
  | { kind: "success"; walletInstance: WalletInstance };

const decodeWalletInstanceDocument = (
  document: unknown,
): E.Either<Error, WalletInstance> =>
  pipe(
    document,
    WalletInstance.decode,
    E.mapLeft(
      () =>
        new InvalidCosmosResourceError(
          "Error decoding wallet instance copy document: invalid result format",
        ),
    ),
  );

const getTelemetryProperties = (document: unknown): Record<string, unknown> => {
  if (typeof document !== "object" || document === null) {
    return {};
  }

  return {
    ...("userId" in document && typeof document.userId === "string"
      ? {
          fiscalCode: document.userId,
        }
      : {}),
    ...("id" in document && typeof document.id === "string"
      ? {
          walletInstanceId: document.id,
        }
      : {}),
  };
};

const isFailedProcessingResult = (
  result: WalletInstanceCopyProcessingResult,
): result is Extract<WalletInstanceCopyProcessingResult, { kind: "failure" }> =>
  result.kind === "failure";

const toFailedProcessingResult = (
  document: unknown,
  error: Error,
): WalletInstanceCopyProcessingResult => ({
  failure: {
    error,
    telemetryProperties: getTelemetryProperties(document),
  },
  kind: "failure",
});

const toFailedResults = (
  results: readonly WalletInstanceCopyProcessingResult[],
): readonly WalletInstanceCopyProcessingFailure[] =>
  results.filter(isFailedProcessingResult).map(({ failure }) => failure);

const toSuccessfulWalletInstances = (
  results: readonly WalletInstanceCopyProcessingResult[],
): readonly WalletInstance[] =>
  results.flatMap((result) =>
    result.kind === "success" ? [result.walletInstance] : [],
  );

const toAggregatedProcessingError = (
  failedResults: readonly WalletInstanceCopyProcessingFailure[],
): Error => {
  const aggregatedError = new Error(
    `failed to copy ${failedResults.length} document(s): ${failedResults
      .map(({ error }, index) => `[${index + 1}] ${error.message}`)
      .join("; ")}`,
  );

  aggregatedError.name = "CopyWalletInstancesToUatError";

  return aggregatedError;
};

const getUniqueTelemetryPropertyValues = (
  failedResults: readonly WalletInstanceCopyProcessingFailure[],
  propertyName: string,
): string | undefined => {
  const values = Array.from(
    new Set(
      failedResults.flatMap(({ telemetryProperties }) => {
        const propertyValue = telemetryProperties[propertyName];

        return typeof propertyValue === "string" ? [propertyValue] : [];
      }),
    ),
  );

  return values.length > 0 ? JSON.stringify(values) : undefined;
};

const toAggregatedTelemetryProperties = (
  failedResults: readonly WalletInstanceCopyProcessingFailure[],
): Record<string, unknown> => ({
  failedDocumentCount: failedResults.length,
  ...(getUniqueTelemetryPropertyValues(failedResults, "fiscalCode")
    ? {
        failedFiscalCodes: getUniqueTelemetryPropertyValues(
          failedResults,
          "fiscalCode",
        ),
      }
    : {}),
  ...(getUniqueTelemetryPropertyValues(failedResults, "walletInstanceId")
    ? {
        failedWalletInstanceIds: getUniqueTelemetryPropertyValues(
          failedResults,
          "walletInstanceId",
        ),
      }
    : {}),
});

const processWalletInstanceDocument = (
  document: unknown,
): RTE.ReaderTaskEither<unknown, never, WalletInstanceCopyProcessingResult> =>
  pipe(
    document,
    decodeWalletInstanceDocument,
    E.map((walletInstance) => ({
      kind: "success" as const,
      walletInstance,
    })),
    RTE.fromEither,
    RTE.orElseW((error) =>
      RTE.right(toFailedProcessingResult(document, error)),
    ),
  );

export const CopyWalletInstancesToUatHandler = H.of(
  flow(
    RA.traverse(RTE.ApplicativeSeq)(processWalletInstanceDocument),
    RTE.chainFirst((results) => {
      const failedResults = toFailedResults(results);

      return failedResults.length === 0
        ? RTE.right(undefined)
        : pipe(
            failedResults,
            toAggregatedProcessingError,
            sendTelemetryException({
              ...toAggregatedTelemetryProperties(failedResults),
              functionName: "copyWalletInstancesToUat",
            }),
            E.orElseW(() => E.right(undefined)),
            RTE.fromEither,
          );
    }),
    RTE.map(toSuccessfulWalletInstances),
  ),
);
