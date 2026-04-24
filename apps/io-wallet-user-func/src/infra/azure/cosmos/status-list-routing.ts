import { Container, Database } from "@azure/cosmos";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import {
  CosmosNotFoundError,
  InvalidCosmosResourceError,
  toCosmosErrorOrInvalidResource,
} from "@/infra/azure/cosmos/errors";
import { StatusListAllocatorRoutingDataSource } from "@/infra/status-list-allocator";
import { StatusListLifecycleRoutingDataSource } from "@/infra/status-list-lifecycle";

export class CosmosDbStatusListRoutingRepository
  implements
    StatusListAllocatorRoutingDataSource,
    StatusListLifecycleRoutingDataSource
{
  readonly #container: Container;

  constructor(db: Database) {
    this.#container = db.container("status-list-routing");
  }

  readonly addRoutableStatusListIds = async (
    statusListIds: readonly NonEmptyString[],
  ) => {
    if (statusListIds.length === 0) {
      return;
    }

    await Promise.all(
      statusListIds.map((id) =>
        this.#container.items.upsert({
          id,
        }),
      ),
    ).catch((error) => {
      throw toCosmosErrorOrInvalidResource(
        "Error upserting routable status lists",
      )(error);
    });
  };

  readonly getOpenStatusListIds = async () => {
    const { resources } = await this.#container.items
      .query({
        query: "SELECT c.id FROM c",
      })
      .fetchAll()
      .catch((error) => {
        throw toCosmosErrorOrInvalidResource(
          "Error listing routable status lists",
        )(error);
      });

    if (
      !Array.isArray(resources) ||
      !resources.every(
        (r) =>
          r &&
          typeof r === "object" &&
          typeof r.id === "string" &&
          r.id.length > 0,
      )
    ) {
      throw new InvalidCosmosResourceError(
        "Error listing routable status lists: invalid result format",
      );
    }

    return resources.map((r) => r.id);
  };

  readonly getOpenStatusListIdsAsync = () => this.getOpenStatusListIds();

  readonly removeRoutableStatusListIds = async (
    statusListIds: readonly NonEmptyString[],
  ) => {
    if (statusListIds.length === 0) {
      return;
    }

    await Promise.all(
      statusListIds.map(async (id) => {
        try {
          await this.#container.item(id, id).delete();
        } catch (error) {
          const mappedError = toCosmosErrorOrInvalidResource(
            "Error deleting routable status lists",
          )(error);

          if (mappedError instanceof CosmosNotFoundError) {
            return;
          }

          throw mappedError;
        }
      }),
    );
  };
}
