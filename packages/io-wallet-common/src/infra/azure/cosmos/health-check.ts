import { CosmosClient } from "@azure/cosmos";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export const getCosmosHealth: RTE.ReaderTaskEither<
  { cosmosClient: CosmosClient },
  Error,
  true
> = ({ cosmosClient }) =>
  pipe(
    TE.tryCatch(
      () => cosmosClient.getDatabaseAccount(),
      () => new Error("cosmos-db-error"),
    ),
    TE.map(() => true),
  );
