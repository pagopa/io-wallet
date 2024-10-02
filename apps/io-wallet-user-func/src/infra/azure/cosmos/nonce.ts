import { NonceRepository } from "@/nonce";
import { Container, Database } from "@azure/cosmos";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { ServiceUnavailableError } from "io-wallet-common/error";

export class CosmosDbNonceRepository implements NonceRepository {
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("nonces");
  }

  /*
  This method is used for nonce validation.
  Instead of checking if the nonce exists and then deleting it, we delete it directly to ensure an atomic operation. The `delete` method used will return a 404 error if the item to be deleted does not exist.
  Therefore, if the nonce does not exist, we will receive a 404 and thus the nonce will not be valid
  */
  delete(nonce: string) {
    return pipe(
      TE.tryCatch(
        async () => {
          await this.#container.item(nonce, nonce).delete();
        },
        (error) => {
          if (error instanceof Error && error.name === "TimeoutError") {
            return new ServiceUnavailableError(error.message);
          }
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 404
          ) {
            return new Error("Invalid nonce");
          }
          return new Error(`Error deleting nonce: ${error}`);
        },
      ),
    );
  }

  insert(nonce: string) {
    return TE.tryCatch(
      async () => {
        await this.#container.items.create({
          id: nonce,
        });
      },
      (error) =>
        error instanceof Error && error.name === "TimeoutError"
          ? new ServiceUnavailableError(error.message)
          : new Error(`Error inserting nonce: ${error}`),
    );
  }
}
