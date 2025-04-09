import { FiscalCodeRepository } from "@/fiscal-code";
import { Container, Database } from "@azure/cosmos";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";

const toError = (genericMessage: string) => (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError"
    ? new ServiceUnavailableError(
        `The request to the database has timed out: ${error.message}`,
      )
    : new Error(`${genericMessage}: ${error}`);

export class CosmosDbFiscalCodeRepository implements FiscalCodeRepository {
  #containerName: Container;

  constructor(db: Database) {
    this.#containerName = db.container("whitelisted-fiscal-codes");
  }

  getFiscalCodeWhitelisted(
    fiscalCode: FiscalCode,
  ): TE.TaskEither<Error, { whitelisted: boolean; whitelistedAt?: string }> {
    return TE.tryCatch(async () => {
      const { resource } = await this.#containerName
        .item(fiscalCode, fiscalCode)
        .read();
      if (resource !== undefined) {
        return {
          whitelisted: true,
          whitelistedAt: new Date(resource._ts * 1000).toISOString(),
        };
      } else {
        return {
          whitelisted: false,
        };
      }
    }, toError("Failed to check fiscal code"));
  }
}
