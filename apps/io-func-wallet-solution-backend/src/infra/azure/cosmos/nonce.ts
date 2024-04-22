import { Container, Database } from "@azure/cosmos";
import * as TE from "fp-ts/lib/TaskEither";
import { NonceRepository } from "@/nonce";

export class CosmosDbNonceRepository implements NonceRepository {
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("nonces");
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
}
