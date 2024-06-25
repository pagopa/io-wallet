import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";
import { Container, Database, PatchOperationInput } from "@azure/cosmos";
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

  batchPatch(
    operationsInput: {
      id: string;
      operations: {
        op: "add" | "incr" | "remove" | "replace" | "set";
        path: string;
        value: unknown;
      }[];
    }[],
    userId: string,
  ) {
    return TE.tryCatch(
      async () => {
        const operations: PatchOperationInput[] = operationsInput.map(
          ({ id, operations }) => ({
            id,
            operationType: "Patch",
            resourceBody: {
              operations,
            },
          }),
        );
        await this.#container.items.batch(operations, userId);
      },
      (error) => new Error(`Error updating wallet instances: ${error}`),
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

  insert(walletInstance: WalletInstance) {
    return TE.tryCatch(
      async () => {
        await this.#container.items.create(walletInstance);
      },
      (error) => new Error(`Error inserting wallet instance: ${error}`),
    );
  }
}
