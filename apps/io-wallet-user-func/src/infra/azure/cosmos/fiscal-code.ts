import { FiscalCodeRepository } from "@/fiscal-code";
import { Container, Database } from "@azure/cosmos";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
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
    this.#containerName = db.container("fiscal-codes");
  }

  isFiscalCodeWhitelisted(
    fiscalCode: NonEmptyString,
  ): TE.TaskEither<Error, boolean> {
    return TE.tryCatch(async () => {
      const { resource } = await this.#containerName
        .item(fiscalCode, fiscalCode)
        .read();
      return resource !== undefined;
    }, toError("Failed to check fiscal code"));
  }
}
