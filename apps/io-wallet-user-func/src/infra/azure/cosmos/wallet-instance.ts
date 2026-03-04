import { Container, Database, PatchOperationInput } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { ServiceUnavailableError } from "io-wallet-common/error";
import {
  WalletInstance,
  WalletInstanceValid,
} from "io-wallet-common/wallet-instance";

import { WalletInstanceRepository } from "@/wallet-instance";

const toError = (genericMessage: string) => (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError"
    ? new ServiceUnavailableError(
        `The request to the database has timed out: ${error.message}`,
      )
    : new Error(`${genericMessage}: ${error}`);

export class CosmosDbWalletInstanceRepository implements WalletInstanceRepository {
  #userIdKeyedContainer: Container;

  constructor(db: Database) {
    this.#userIdKeyedContainer = db.container("wallet-instances");
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
    return TE.tryCatch(async () => {
      const operations: PatchOperationInput[] = operationsInput.map(
        ({ id, operations }) => ({
          id,
          operationType: "Patch",
          resourceBody: {
            operations,
          },
        }),
      );
      await this.#userIdKeyedContainer.items.batch(operations, userId);
    }, toError("Error updating wallet instances"));
  }

  getByUserId(id: WalletInstance["id"], userId: WalletInstance["userId"]) {
    return pipe(
      TE.tryCatch(
        () => this.#userIdKeyedContainer.item(id, userId).read(),
        toError("Error getting wallet instance"),
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

  getLastByUserId(userId: WalletInstance["userId"]) {
    return pipe(
      TE.tryCatch(async () => {
        const { resources: items } = await this.#userIdKeyedContainer.items
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
      }, toError("Error getting wallet instance by user id")),
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

  getValidByUserIdExcludingOne(
    walletInstanceId: WalletInstance["id"],
    userId: WalletInstance["userId"],
  ) {
    return pipe(
      TE.tryCatch(async () => {
        const { resources: items } = await this.#userIdKeyedContainer.items
          .query({
            parameters: [
              {
                name: "@partitionKey",
                value: userId,
              },
              {
                name: "@idKey",
                value: walletInstanceId,
              },
            ],
            query:
              "SELECT * FROM c WHERE c.id != @idKey AND c.userId = @partitionKey AND c.isRevoked = false",
          })
          .fetchAll();
        return items;
      }, toError("Error getting wallet instances by user id")),
      TE.chain((items) =>
        pipe(
          items,
          RA.head,
          O.fold(
            () => TE.right(O.none),
            () =>
              pipe(
                items,
                t.array(WalletInstanceValid).decode,
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

  insert(walletInstance: WalletInstance) {
    return TE.tryCatch(async () => {
      await this.#userIdKeyedContainer.items.create(walletInstance);
    }, toError("Error inserting wallet instance"));
  }
}
