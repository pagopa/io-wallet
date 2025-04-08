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

  checkByFiscalCode(fiscalCode: NonEmptyString): TE.TaskEither<Error, boolean> {
    return TE.tryCatch(async () => {
      const { resources } = await this.#containerName.items
        .query({
          parameters: [{ name: "@fiscalCode", value: fiscalCode }],
          query: "SELECT COUNT(1) FROM c WHERE c.fiscalCode = @fiscalCode",
        })
        .fetchAll();
      return resources[0]["$1"] > 0;
    }, toError("Failed to check fiscal code"));
  }
}
