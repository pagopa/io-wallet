import { Container, Database } from "@azure/cosmos";
import * as TE from "fp-ts/lib/TaskEither";
import { NonceRepository } from "@/nonce";

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
    return TE.tryCatch(
      async () => {
        await this.#container.item(nonce, nonce).delete();
      },
      (error) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 404
          ? new Error("Invalid nonce")
          : new Error(`Error deleting nonce: ${error}`)
    );
  }

  insert(nonce: string) {
    return TE.tryCatch(
      async () => {
        await this.#container.items.create({
          id: nonce,
        });
      },
      (error) => new Error(`Error inserting nonce: ${error}`)
    );
  }
}
