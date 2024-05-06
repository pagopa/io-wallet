import { Container, Database } from "@azure/cosmos";
import * as TE from "fp-ts/TaskEither";
import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";

export class CosmosDbWalletInstanceRepository
  implements WalletInstanceRepository
{
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("wallet-instances");
  }

  insert(walletInstance: WalletInstance) {
    return TE.tryCatch(
      async () => {
        await this.#container.items.create(walletInstance);
      },
      (error) => new Error(`Error inserting wallet instance: ${error}`)
    );
  }
}
