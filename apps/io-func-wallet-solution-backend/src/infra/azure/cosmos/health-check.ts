import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { CosmosClient } from "@azure/cosmos";

export const getCosmosHealth: RTE.ReaderTaskEither<
  { cosmosClient: CosmosClient },
  Error,
  true
> = ({ cosmosClient }) =>
  pipe(
    TE.tryCatch(
      () => cosmosClient.getDatabaseAccount(),
      () => new Error("cosmos-db-error")
    ),
    TE.map(() => true)
  );
