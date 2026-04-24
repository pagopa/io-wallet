import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import {
  WalletInstance,
  WalletInstanceRevoked,
  WalletInstanceValid,
} from "io-wallet-common/wallet-instance";

import {
  CosmosNotFoundError,
  InvalidCosmosResourceError,
} from "@/infra/azure/cosmos/errors";
import { sendTelemetryException } from "@/infra/telemetry";
import { allocateStatusListBinding, StatusListAllocator } from "@/status-list";
import { addStatus } from "@/wallet-instance";
import {
  revokeWalletInstanceStatus,
  saveWalletInstanceStatus,
  WalletInstanceStatusRepository,
} from "@/wallet-instance-status";

interface BackfillWalletInstanceStatusEnvironment {
  statusListAllocator: StatusListAllocator;
  walletInstanceStatusRepository: WalletInstanceStatusRepository;
}

interface BackfillWalletInstanceStatusProcessingSummary {
  failedResults: readonly WalletInstanceStatusProcessingFailure[];
}

interface WalletInstanceStatusProcessingFailure {
  error: Error;
  telemetryProperties: Record<string, unknown>;
}

type WalletInstanceStatusProcessingResult =
  | {
      failure: WalletInstanceStatusProcessingFailure;
      kind: "failure";
    }
  | { kind: "success" };

const decodeWalletInstanceDocument = (
  document: unknown,
): E.Either<Error, WalletInstance> =>
  pipe(
    document,
    WalletInstance.decode,
    E.mapLeft(
      () =>
        new InvalidCosmosResourceError(
          "Error decoding wallet instance status migration document: invalid result format",
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
  result: WalletInstanceStatusProcessingResult,
): result is Extract<
  WalletInstanceStatusProcessingResult,
  { kind: "failure" }
> => result.kind === "failure";

const toFailedProcessingResult = (
  document: unknown,
  error: Error,
): WalletInstanceStatusProcessingResult => ({
  failure: {
    error,
    telemetryProperties: getTelemetryProperties(document),
  },
  kind: "failure",
});

const toBackfillWalletInstanceStatusProcessingSummary = (
  results: readonly WalletInstanceStatusProcessingResult[],
): BackfillWalletInstanceStatusProcessingSummary => ({
  failedResults: results
    .filter(isFailedProcessingResult)
    .map(({ failure }) => failure),
});

const toAggregatedProcessingError = (
  failedResults: readonly WalletInstanceStatusProcessingFailure[],
): Error => {
  const aggregatedError = new Error(
    `failed to process ${failedResults.length} document(s): ${failedResults
      .map(({ error }, index) => `[${index + 1}] ${error.message}`)
      .join("; ")}`,
  );

  aggregatedError.name = "BackfillWalletInstanceStatusError";

  return aggregatedError;
};

const getUniqueTelemetryPropertyValues = (
  failedResults: readonly WalletInstanceStatusProcessingFailure[],
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
  failedResults: readonly WalletInstanceStatusProcessingFailure[],
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

const enrichWalletInstance = (
  walletInstance: WalletInstanceValid,
): RTE.ReaderTaskEither<
  BackfillWalletInstanceStatusEnvironment,
  Error,
  WalletInstance
> =>
  pipe(
    allocateStatusListBinding,
    RTE.map((statusBinding) => addStatus(walletInstance, statusBinding)),
  );

type WalletInstanceRevokedWithoutStatus = WalletInstanceRevoked & {
  status?: never;
};

type WalletInstanceValidWithoutStatus = WalletInstanceValid & {
  status?: never;
};

const isWalletInstanceValidWithoutStatus = (
  walletInstance: WalletInstance,
): walletInstance is WalletInstanceValidWithoutStatus =>
  walletInstance.isRevoked === false && !("status" in walletInstance);

const isWalletInstanceRevocation = (
  walletInstance: WalletInstance,
): walletInstance is WalletInstanceRevokedWithoutStatus =>
  walletInstance.isRevoked === true && !("status" in walletInstance);

const revokeWalletInstanceStatusForBackfill =
  (
    walletInstance: WalletInstanceRevokedWithoutStatus,
  ): RTE.ReaderTaskEither<
    BackfillWalletInstanceStatusEnvironment,
    Error,
    void
  > =>
  ({ walletInstanceStatusRepository }) =>
    pipe(
      revokeWalletInstanceStatus(walletInstance)({
        walletInstanceStatusRepository,
      }),
      TE.orElseW((error) =>
        error instanceof CosmosNotFoundError
          ? walletInstanceStatusRepository.save(walletInstance)
          : TE.left(error),
      ),
    );

const persistDecodedWalletInstance = (
  walletInstance: WalletInstance,
): RTE.ReaderTaskEither<
  BackfillWalletInstanceStatusEnvironment,
  Error,
  void
> =>
  isWalletInstanceValidWithoutStatus(walletInstance)
    ? pipe(
        enrichWalletInstance(walletInstance),
        RTE.chainW(saveWalletInstanceStatus),
      )
    : isWalletInstanceRevocation(walletInstance)
      ? revokeWalletInstanceStatusForBackfill(walletInstance)
      : saveWalletInstanceStatus(walletInstance);

const processWalletInstanceStatusDocument = (
  document: unknown,
): RTE.ReaderTaskEither<
  BackfillWalletInstanceStatusEnvironment,
  never,
  WalletInstanceStatusProcessingResult
> =>
  pipe(
    document,
    decodeWalletInstanceDocument,
    RTE.fromEither,
    RTE.chainW(persistDecodedWalletInstance),
    RTE.map(() => ({ kind: "success" as const })),
    RTE.orElseW((error) =>
      RTE.right(toFailedProcessingResult(document, error)),
    ),
  );

export const BackfillWalletInstanceStatusHandler = H.of(
  flow(
    RA.traverse(RTE.ApplicativeSeq)(processWalletInstanceStatusDocument),
    RTE.map(toBackfillWalletInstanceStatusProcessingSummary),
    RTE.chainFirst(({ failedResults }) =>
      failedResults.length === 0
        ? RTE.right(undefined)
        : pipe(
            failedResults,
            toAggregatedProcessingError,
            sendTelemetryException({
              ...toAggregatedTelemetryProperties(failedResults),
              functionName: "backfillWalletInstanceStatus",
            }),
            E.orElseW(() => E.right(undefined)),
            RTE.fromEither,
          ),
    ),
  ),
);
