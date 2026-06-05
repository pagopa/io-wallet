import { Container, Database } from "@azure/cosmos";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";

import { toCosmosError } from "@/infra/azure/cosmos/errors";
import { WhitelistedFiscalCodeRepository } from "@/whitelisted-fiscal-code";

const toError = (genericMessage: string) => (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError"
    ? new ServiceUnavailableError(
        `The request to the database has timed out: ${error.message}`,
      )
    : new Error(`${genericMessage}: ${error}`);

const maxBulkRetryAttempts = 5;
const minRetryDelayMs = 200;
const maxRetryDelayMs = 5000;

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

  constructor(db: Database) {
    this.#containerName = db.container("whitelisted-fiscal-codes");
  }

  checkIfFiscalCodeIsWhitelisted(
    fiscalCode: FiscalCode,
  ): TE.TaskEither<Error, { whitelisted: boolean; whitelistedAt?: string }> {
    return TE.tryCatch(async () => {
      const { resource } = await this.#containerName
        .item(fiscalCode, fiscalCode)
        .read();
      if (resource !== undefined) {
        return {
          whitelisted: true,
          whitelistedAt: resource.createdAt,
        };
      } else {
        return {
          whitelisted: false,
        };
      }
    }, toError("Failed to check fiscal code"));
  }

  insertWhitelistedFiscalCodes(
    fiscalCodes: FiscalCode[],
  ): TE.TaskEither<Error, void> {
    return TE.tryCatch(async () => {
      if (fiscalCodes.length === 0) {
        return;
      }

      const createdAt = new Date().toISOString();
      let pendingOperations = fiscalCodes.map((fiscalCode) => ({
        operationType: "Create" as const,
        partitionKey: fiscalCode,
        resourceBody: {
          createdAt,
          id: fiscalCode,
        },
      }));

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
    }, toCosmosError("Failed to insert fiscal codes"));
  }
}
