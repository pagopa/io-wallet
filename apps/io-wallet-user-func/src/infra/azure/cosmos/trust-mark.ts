import { Container, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";

const TrustMarkDocument = t.type({
  id: t.string,
  trustMark: t.string,
});

const TrustMarkDocuments = t.array(TrustMarkDocument);

export interface TrustMarkRepository {
  listTrustMarks: TE.TaskEither<
    Error,
    readonly t.TypeOf<typeof TrustMarkDocument>[]
  >;
}

export class CosmosDbTrustMarkRepository implements TrustMarkRepository {
  #container: Container;

  listTrustMarks = pipe(
    TE.tryCatch(
      () =>
        this.#container.items
          .query({ query: "SELECT c.id, c.trustMark FROM c" })
          .fetchAll(),
      E.toError,
    ),
    TE.chain(({ resources }) =>
      pipe(
        TrustMarkDocuments.decode(resources),
        E.mapLeft(
          () => new Error("Error listing trust marks: invalid result format"),
        ),
        TE.fromEither,
      ),
    ),
  );

  constructor(db: Database) {
    this.#container = db.container("trust-marks");
  }
}
