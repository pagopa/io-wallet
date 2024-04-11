import { Container, Database } from "@azure/cosmos";
import { NonceRepository } from "../../../nonce";

export class CosmosDbNonceRepository implements NonceRepository {
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("nonces");
  }

  async insert(nonce: string) {
    try {
      await this.#container.items.create({
        id: nonce,
      });
    } catch (e) {
      throw new Error("Error inserting nonce");
    }
  }
}
