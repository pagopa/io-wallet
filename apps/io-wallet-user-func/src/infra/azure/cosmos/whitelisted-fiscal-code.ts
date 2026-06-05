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
      const results = await this.#containerName.items.executeBulkOperations(
        fiscalCodes.map((fiscalCode) => ({
          operationType: "Create" as const,
          partitionKey: fiscalCode,
          resourceBody: {
            createdAt,
            id: fiscalCode,
          },
        })),
      );

      for (const { error } of results) {
        if (error === undefined || error.code === 409) {
          continue;
        }

        throw toCosmosError("Failed to insert fiscal codes")(error);
      }
    }, toCosmosError("Failed to insert fiscal codes"));
  }
}
