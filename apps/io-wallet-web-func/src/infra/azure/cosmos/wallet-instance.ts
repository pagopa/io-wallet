import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";
import { Container, Database } from "@azure/cosmos";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";

export class CosmosDbWalletInstanceRepository
  implements WalletInstanceRepository
{
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("wallet-instances");
  }

  getLastByUserId(userId: WalletInstance["userId"]) {
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
              query:
                "SELECT TOP 1 * FROM c WHERE c.userId = @partitionKey ORDER BY c.createdAt DESC",
            })
            .fetchAll();
          return items;
        },
        (error) =>
          new Error(`Error getting wallet instances by user id: ${error}`),
      ),
      TE.chain((walletInstances) =>
        !walletInstances.length
          ? TE.right(O.none)
          : pipe(
              walletInstances,
              t.array(WalletInstance).decode,
              TE.fromEither,
              TE.map((walletInstances) => O.some(walletInstances[0])),
              TE.mapLeft(
                () =>
                  new Error(
                    "Error getting last wallet instance: invalid result format",
                  ),
              ),
            ),
      ),
    );
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
      TE.chain((walletInstances) =>
        !walletInstances.length
          ? TE.right(O.none)
          : pipe(
              walletInstances,
              t.array(WalletInstance).decode,
              TE.fromEither,
              TE.map(O.some),
              TE.mapLeft(
                () =>
                  new Error(
                    "Error getting wallet instances: invalid result format",
                  ),
              ),
            ),
      ),
    );
  }
}
