import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import { EntityConfigurationEnvironment } from "./entity-configuration";

// Build the JWT body for the entity configuration metadata and return the signed JWT
export const createWalletInstanceAttestation =
  (
    assertion: string
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
    pipe(
      {
        iss: federationEntityMetadata.basePath.href,
        sub: federationEntityMetadata.basePath.href,
        assertion,
      },
      TE.of,
      TE.chain(signer.createJwtAndsign("entity-statement+jwt"))
    );
