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
}
