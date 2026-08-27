import { Container, Database, type OperationInput } from "@azure/cosmos";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as A from "fp-ts/lib/Array";
import * as TE from "fp-ts/lib/TaskEither";

import { toCosmosError } from "@/infra/azure/cosmos/errors";
import { WhitelistedFiscalCodeRepository } from "@/whitelisted-fiscal-code";

const maxBulkRetryAttempts = 5;
const minRetryDelayMs = 200;
const maxRetryDelayMs = 5000;

interface WhitelistedFiscalCodesWriteConfig {
  bulkChunkSize: number;
  delayMs: number;
}

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

const getBulkRetryDelayMs = (
  error: {
    message?: string;
    retryAfterInMilliseconds?: number;
    retryAfterInMs?: number;
  },
  attempt: number,
): number => {
  const retryAfterFromSdk =
    error.retryAfterInMilliseconds ?? error.retryAfterInMs;

  if (retryAfterFromSdk !== undefined && Number.isFinite(retryAfterFromSdk)) {
    return Math.max(retryAfterFromSdk, minRetryDelayMs);
  }

  const retryAfterFromMessage = Number(
    error.message?.match(/RetryAfterMs=(\d+)/i)?.[1],
  );

  if (Number.isFinite(retryAfterFromMessage)) {
    return Math.max(retryAfterFromMessage, minRetryDelayMs);
  }

  return Math.min(minRetryDelayMs * 2 ** (attempt - 1), maxRetryDelayMs);
};

export class CosmosDbWhitelistedFiscalCodeRepository implements WhitelistedFiscalCodeRepository {
  #containerName: Container;
  #writeConfig: WhitelistedFiscalCodesWriteConfig;

  constructor(
    db: Database,
    containerName: string,
    writeConfig: WhitelistedFiscalCodesWriteConfig,
  ) {
    this.#writeConfig = writeConfig;
    this.#containerName = db.container(containerName);
  }

  insertWhitelistedFiscalCodes(
    fiscalCodes: FiscalCode[],
  ): TE.TaskEither<Error, void> {
    return TE.tryCatch(async () => {
      if (fiscalCodes.length === 0) {
        return;
      }

      const createdAt = new Date().toISOString();
      const operations = fiscalCodes.map((fiscalCode) => ({
        operationType: "Create" as const,
        partitionKey: fiscalCode,
        resourceBody: {
          createdAt,
          id: fiscalCode,
        },
      }));
      const operationChunks = A.chunksOf(this.#writeConfig.bulkChunkSize)(
        operations,
      );

      for (const [index, operationChunk] of operationChunks.entries()) {
        await this.#insertOperationsWithRetries(operationChunk);

        if (
          index < operationChunks.length - 1 &&
          this.#writeConfig.delayMs > 0
        ) {
          await wait(this.#writeConfig.delayMs);
        }
      }
    }, toCosmosError("Failed to insert fiscal codes"));
  }

  async #insertOperationsWithRetries(
    operations: OperationInput[],
  ): Promise<void> {
    let pendingOperations = operations;

    for (let attempt = 1; attempt <= maxBulkRetryAttempts; attempt++) {
      const results =
        await this.#containerName.items.executeBulkOperations(
          pendingOperations,
        );

      const throttledOperations = [];
      let maxRetryDelay = minRetryDelayMs;

      for (const [index, { error }] of results.entries()) {
        if (error === undefined || error.code === 409) {
          continue;
        }

        if (error.code === 429) {
          throttledOperations.push(pendingOperations[index]);
          maxRetryDelay = Math.max(
            maxRetryDelay,
            getBulkRetryDelayMs(error, attempt),
          );
          continue;
        }

        throw error;
      }

      if (throttledOperations.length === 0) {
        return;
      }

      if (attempt === maxBulkRetryAttempts) {
        throw new Error(
          `Cosmos DB throttled ${throttledOperations.length} operations after ${maxBulkRetryAttempts} attempts`,
        );
      }

      pendingOperations = throttledOperations;
      await wait(maxRetryDelay);
    }
  }
}
