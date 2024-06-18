import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";
import { Container, Database } from "@azure/cosmos";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { validate } from "io-wallet-common";

export class CosmosDbWalletInstanceRepository
  implements WalletInstanceRepository
{
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("wallet-instances");
  }

  getAllByUserId(userId: WalletInstance["userId"]) {
    return pipe(
      TE.tryCatch(
        async () => {
          const { resources: items } = await this.#container.items
            .query({
              parameters: [
                {
                  name: "@partitionKey",
                  value: userId,
                },
              ],
              query: "SELECT * FROM c WHERE c.userId = @partitionKey",
            })
            .fetchAll();
          return items;
        },
        (error) =>
          new Error(`Error getting wallet instances by user id: ${error}`),
      ),
      TE.chainW(
        flow(
          validate(t.array(WalletInstance), "Invalid wallet instances"),
          TE.fromEither,
        ),
      ),
    );
  }
}
