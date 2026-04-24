import { Container, Database } from "@azure/cosmos";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { toCosmosErrorOrInvalidResource } from "@/infra/azure/cosmos/errors";
import { StatusListLifecyclePagesDataSource } from "@/infra/status-list-lifecycle";

export class CosmosDbStatusListPagesRepository implements StatusListLifecyclePagesDataSource {
  readonly #container: Container;

  readonly #emptyBitsetBase64: string;

  readonly #pageBitsSize: number;

  readonly #pageCount: number;

  constructor(db: Database, pageCount: number, pageBitsSize: number) {
    this.#container = db.container("status-list-pages");
    this.#pageBitsSize = pageBitsSize;
    this.#pageCount = pageCount;
    this.#emptyBitsetBase64 = Buffer.alloc(pageBitsSize / 8).toString("base64");
  }

  readonly createEmptyPagesForStatusList = async (
    statusListId: NonEmptyString,
  ) => {
    const operations = Array.from(
      { length: this.#pageCount },
      (_, pageIndex) => ({
        operationType: "Create" as const,
        partitionKey: statusListId,
        resourceBody: {
          bitsetBase64: this.#emptyBitsetBase64,
          id: `${statusListId}:${pageIndex}`,
          pageBitsSize: this.#pageBitsSize,
          pageIndex,
          statusListId,
        },
      }),
    );

    const results = await this.#container.items
      .executeBulkOperations(operations)
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource(
          "Error creating status list pages",
        )(error);
      });

    for (const { error } of results) {
      if (error === undefined || error.code === 409) {
        continue;
      }

      if (error !== undefined) {
        throw toCosmosErrorOrInvalidResource(
          "Error creating status list pages",
        )(error);
      }
    }
  };
}
