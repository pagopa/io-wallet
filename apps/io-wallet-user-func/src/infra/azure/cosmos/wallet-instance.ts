import { Container, Database, PatchOperationInput } from "@azure/cosmos";
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { WalletInstance, WalletInstanceRepository } from "@/wallet-instance";
import { validate } from "@/validation";

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
        resource === undefined
          ? TE.right(O.none)
          : pipe(
              resource,
              WalletInstance.decode,
              E.map(O.some),
              E.mapLeft(
                () =>
                  new Error(
                    "Error getting wallet instance: invalid result format"
                  )
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

  getAllByUserId(userId: WalletInstance["userId"]) {
    return pipe(
      TE.tryCatch(
        async () => {
          const { resources: items } = await this.#container.items
            .query({
              query: "SELECT * FROM c WHERE c.userId = @partitionKey",
              parameters: [
                {
                  name: "@partitionKey",
                  value: userId,
                },
              ],
            })
            .fetchAll();
          return items;
        },
        (error) =>
          new Error(`Error getting wallet instances by user id: ${error}`)
      ),
      TE.chainW(
        flow(
          validate(t.array(WalletInstance), "Invalid wallet instances"),
          TE.fromEither
        )
      )
    );
  }

  batchPatchWithReplaceOperation(
    operationsInput: Array<{
      id: string;
      path: string;
      value: unknown;
    }>,
    userId: string
  ) {
    return TE.tryCatch(
      async () => {
        const operations: PatchOperationInput[] = operationsInput.map(
          ({ id, path, value }) => ({
            operationType: "Patch",
            id,
            resourceBody: {
              operations: [
                {
                  op: "replace",
                  path,
                  value,
                },
              ],
            },
          })
        );
        await this.#container.items.batch(operations, userId);
      },
      (error) => new Error(`Error updating wallet instances: ${error}`)
    );
  }
}
