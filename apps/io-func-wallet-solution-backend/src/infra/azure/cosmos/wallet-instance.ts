import { Container, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";

export class CosmosDbWalletInstanceRepository
  implements WalletInstanceRepository
{
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("wallet-instances");
  }

  get(id: WalletInstance["id"], userId: WalletInstance["userId"]) {
    return pipe(
      TE.tryCatch(
        () => this.#container.item(id, userId).read(),
        (error) => new Error(`Error getting wallet instance: ${error}`)
      ),
      TE.chain(({ resource }) =>
        pipe(
          resource,
          WalletInstance.decode,
          E.mapLeft(
            () =>
              new Error("error getting wallet instance: invalid result format")
          ),
          TE.fromEither
        )
      )
    );
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
