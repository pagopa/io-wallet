import { CertificateRepository } from "@/certificates";
import { Container, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";
import { ServiceUnavailableError } from "io-wallet-common/error";

const CertificateSchema = t.type({
  certificateChain: t.array(t.string),
  id: t.string,
});

export class CosmosDbCertificateRepository implements CertificateRepository {
  #container: Container;

  constructor(db: Database) {
    this.#container = db.container("certificates");
  }

  getCertificateChainByKid(kid: string) {
    return pipe(
      TE.tryCatch(
        () => this.#container.item(kid, kid).read(),
        (error) =>
          error instanceof Error && error.name === "TimeoutError"
            ? new ServiceUnavailableError(
                `The request to the database has timed out: ${error.message}`,
              )
            : new Error(`Error getting certificate: ${error}`),
      ),
      TE.chain(({ resource }) =>
        resource === undefined
          ? TE.right(O.none)
          : pipe(
              resource,
              CertificateSchema.decode,
              E.map(({ certificateChain }) => O.some(certificateChain)),
              E.mapLeft(
                () =>
                  new Error("Error getting certificate: invalid result format"),
              ),
              TE.fromEither,
            ),
      ),
    );
  }

  insertCertificateChain({
    certificateChain,
    kid,
  }: {
    certificateChain: string[];
    kid: string;
  }) {
    return TE.tryCatch(
      async () => {
        await this.#container.items.create({
          certificateChain,
          id: kid,
        });
      },
      (error) =>
        error instanceof Error && error.name === "TimeoutError"
          ? new ServiceUnavailableError(
              `The request to the database has timed out: ${error.message}`,
            )
          : new Error(`Error inserting certificate: ${error}`),
    );
  }
}
