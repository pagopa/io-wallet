import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";
import { Container, Database, PatchOperationInput } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
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

  get(id: WalletInstance["id"], userId: WalletInstance["userId"]) {
    return pipe(
      TE.tryCatch(
        () => this.#container.item(id, userId).read(),
        (error) => new Error(`Error getting wallet instance: ${error}`),
      ),
      TE.chain(({ resource }) =>
        resource === undefined
          ? TE.right(O.none)
          : pipe(
              resource,
              WalletInstance.decode,
              E.map(O.some),
              E.mapLeft(
                () =>
                  new Error(
                    "Error getting wallet instance: invalid result format",
                  ),
              ),
              TE.fromEither,
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
      TE.chain((items) =>
        pipe(
          items,
          RA.head,
          O.fold(
            () => TE.right(O.none),
            () =>
              pipe(
                items,
                t.array(WalletInstance).decode,
                E.map(O.some),
                E.mapLeft(
                  () =>
                    new Error(
                      "Error getting wallet instances: invalid result format",
                    ),
                ),
                TE.fromEither,
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
      TE.chain(
        flow(
          RA.head,
          O.fold(
            () => TE.right(O.none),
            flow(
              WalletInstance.decode,
              E.map(O.some),
              E.mapLeft(
                () =>
                  new Error(
                    "Error getting last wallet instance: invalid result format",
                  ),
              ),
              TE.fromEither,
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
