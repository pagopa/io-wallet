import { Container, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";

import type {
  OpenStatusListsPolicy,
  OpenStatusListsPolicyRepository,
} from "@/use-cases/status-list-manager";

import {
  InvalidCosmosResourceError,
  toCosmosErrorOrInvalidResource,
} from "@/infra/azure/cosmos/errors";

const OPEN_STATUS_LISTS_POLICY_ID = "open-status-lists-policy";

const OpenStatusListsPolicyDocument = t.type({
  automaticMaximumOpenStatusLists: t.number,
  conflictAutoScaleEnabled: t.boolean,
  id: t.literal(OPEN_STATUS_LISTS_POLICY_ID),
  minimumOpenStatusLists: t.number,
});

export class CosmosDbOpenStatusListsPolicyRepository implements OpenStatusListsPolicyRepository {
  readonly #container: Container;

  readonly loadOpenStatusListsPolicy: TE.TaskEither<
    Error,
    OpenStatusListsPolicy
  > = pipe(
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
