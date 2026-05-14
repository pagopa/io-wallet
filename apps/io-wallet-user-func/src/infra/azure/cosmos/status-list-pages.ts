import { Container, Database } from "@azure/cosmos";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { z } from "zod";

import {
  CosmosPreconditionFailedError,
  InvalidCosmosResourceError,
  toCosmosErrorOrInvalidResource,
} from "@/infra/azure/cosmos/errors";
import { nonEmptyStringSchema } from "@/infra/azure/cosmos/schemas";
import {
  applyRevocationWordMasks,
  groupStatusBindingsByPageDocument,
  StatusListBitRevocationPagesDataSource,
  StatusListPageRevocationUpdate,
} from "@/infra/status-list-bit-revocation";
import { StatusListLifecyclePagesDataSource } from "@/infra/status-list-lifecycle";
import { StatusListPublicationPagesDataSource } from "@/infra/status-list-publication";
import { StatusListBinding } from "@/status-list";

const statusListPageDocumentSchema = z.object({
  bitsetBase64: nonEmptyStringSchema,
  id: nonEmptyStringSchema,
  pageBitsSize: z.number(),
  pageIndex: z.number(),
  statusListId: nonEmptyStringSchema,
});

const statusListPageDocumentsSchema = z.array(statusListPageDocumentSchema);

export class CosmosDbStatusListPagesRepository
  implements
    StatusListBitRevocationPagesDataSource,
    StatusListLifecyclePagesDataSource,
    StatusListPublicationPagesDataSource
{
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

  readonly loadPageBitsetsForStatusList = async (
    statusListId: NonEmptyString,
  ): Promise<readonly Buffer[]> => {
    const { resources } = await this.#container.items
      .query(
        {
          parameters: [
            {
              name: "@statusListId",
              value: statusListId,
            },
          ],
          query:
            "SELECT * FROM c WHERE c.statusListId = @statusListId ORDER BY c.pageIndex ASC",
        },
        {
          partitionKey: statusListId,
        },
      )
      .fetchAll()
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource("Error loading status list pages")(
          error,
        );
      });

    const parsedResources = statusListPageDocumentsSchema.safeParse(resources);

    if (!parsedResources.success) {
      throw new InvalidCosmosResourceError(
        "Error loading status list pages: invalid result format",
      );
    }

    return parsedResources.data.map((page, index) => {
      if (page.pageIndex !== index) {
        throw new InvalidCosmosResourceError(
          `Error loading status list pages: expected pageIndex ${index} and found ${page.pageIndex}`,
        );
      }

      return Buffer.from(page.bitsetBase64, "base64");
    });
  };

  readonly revokeBits = async (
    statusBindings: readonly StatusListBinding[],
  ) => {
    const groupedUpdates = groupStatusBindingsByPageDocument(
      statusBindings,
      this.#pageBitsSize,
    );

    await Promise.all(
      groupedUpdates.map((groupedUpdate) =>
        this.#applyRevocationUpdate(groupedUpdate),
      ),
    );
  };

  readonly #applyRevocationUpdate = async (
    groupedUpdate: StatusListPageRevocationUpdate,
  ) => {
    while (true) {
      const { etag, resource } = await this.#container
        .item(groupedUpdate.documentId, groupedUpdate.statusListId)
        .read()
        .catch((error) => {
          throw toCosmosErrorOrInvalidResource(
            "Error reading status list page for revocation",
          )(error);
        });

      const parsedResource = statusListPageDocumentSchema.safeParse(resource);

      if (!parsedResource.success) {
        throw new InvalidCosmosResourceError(
          "Error reading status list page for revocation: invalid result format",
        );
      }

      const pageDocument = parsedResource.data;

      const { bitsetBase64, hasChanges } = applyRevocationWordMasks({
        bitsetBase64: pageDocument.bitsetBase64,
        wordMasks: groupedUpdate.wordMasks,
      });

      if (!hasChanges) {
        return;
      }

      try {
        await this.#container
          .item(groupedUpdate.documentId, groupedUpdate.statusListId)
          .replace(
            {
              ...pageDocument,
              bitsetBase64,
            },
            {
              accessCondition: {
                condition: etag,
                type: "IfMatch",
              },
            },
          );

        return;
      } catch (error) {
        const mappedError = toCosmosErrorOrInvalidResource(
          "Error updating status list page for revocation",
        )(error);

        if (mappedError instanceof CosmosPreconditionFailedError) {
          continue;
        }

        throw mappedError;
      }
    }
  };
}
