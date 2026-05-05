import { Container, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";

import type { OpenStatusListsPolicyRepository } from "@/use-cases/status-list-manager";

import {
  InvalidCosmosResourceError,
  toCosmosErrorOrInvalidResource,
} from "@/infra/azure/cosmos/errors";

const OPEN_STATUS_LISTS_POLICY_ID = "open-status-lists-policy";

// These runtime settings can be updated by editing the global document in the
// `status-list-catalogs` container with id and partition key
// `open-status-lists-policy`.
// `minimumOpenStatusLists` is the minimum number of status lists to keep
// available.
// `automaticMaximumOpenStatusLists` is the temporary target used to scale up
// when recent allocation conflicts are high.
// `conflictAutoScaleEnabled` enables or disables that conflict-based auto
// scale-up behavior.
const OpenStatusListsPolicyDocument = t.type({
  automaticMaximumOpenStatusLists: t.number,
  conflictAutoScaleEnabled: t.boolean,
  id: t.literal(OPEN_STATUS_LISTS_POLICY_ID),
  minimumOpenStatusLists: t.number,
});

export class CosmosDbOpenStatusListsPolicyRepository implements OpenStatusListsPolicyRepository {
  readonly #container: Container;

  readonly loadOpenStatusListsPolicy = pipe(
    TE.tryCatch(async () => {
      const { resource } = await this.#container
        .item(OPEN_STATUS_LISTS_POLICY_ID, OPEN_STATUS_LISTS_POLICY_ID)
        .read();

      if (resource === undefined) {
        throw new InvalidCosmosResourceError(
          "Error loading open status lists policy: missing document",
        );
      }

      return resource;
    }, toCosmosErrorOrInvalidResource("Error loading open status lists policy")),
    TE.chainW((resource) =>
      pipe(
        resource,
        OpenStatusListsPolicyDocument.decode,
        E.mapLeft(
          () =>
            new InvalidCosmosResourceError(
              "Error decoding open status lists policy: invalid result format",
            ),
        ),
        TE.fromEither,
      ),
    ),
  );

  constructor(db: Database) {
    this.#container = db.container("status-list-catalogs");
  }
}
