import { Container, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { ECKeyWithKid } from "io-wallet-common/jwk";

import { Key, KeyRepository } from "@/keys";

const KeySchema = t.type({
  certificateChain: t.array(t.string),
  id: t.string,
  publicKey: ECKeyWithKid,
});

export class CosmosDbKeyRepository implements KeyRepository {
  #container: Container;

  constructor(db: Database, containerName = "keys") {
    this.#container = db.container(containerName);
  }

  createKey({ certificateChain, keyName: id, publicKey }: Key) {
    return pipe(
      TE.tryCatch(
        async () => {
          await this.#container.items.create({
            certificateChain,
            id,
            publicKey,
          });
        },
        (error) =>
          error instanceof Error && error.name === "TimeoutError"
            ? new ServiceUnavailableError(
                `The request to the database has timed out: ${error.message}`,
              )
            : new Error(`Error creating key: ${error}`),
      ),
    );
  }

  getKeyByName(keyName: string) {
    return pipe(
      TE.tryCatch(
        () => this.#container.item(keyName, keyName).read(),
        (error) =>
          error instanceof Error && error.name === "TimeoutError"
            ? new ServiceUnavailableError(
                `The request to the database has timed out: ${error.message}`,
              )
            : new Error(`Error getting key: ${error}`),
      ),
      TE.chain(({ resource }) =>
        resource === undefined
          ? TE.right(O.none)
          : pipe(
              resource,
              KeySchema.decode,
              E.map(({ certificateChain, id: keyName, publicKey }) =>
                O.some({ certificateChain, keyName, publicKey }),
              ),
              E.mapLeft(
                () => new Error("Error getting key: invalid result format"),
              ),
              TE.fromEither,
            ),
      ),
    );
  }
}
