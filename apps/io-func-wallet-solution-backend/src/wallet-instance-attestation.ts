import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import { EntityConfigurationEnvironment } from "./entity-configuration";

// Build the JWT of the Wallet Instance Attestation given a Wallet Instance Attestation Request
export const createWalletInstanceAttestation =
  (
    walletInstanceAttestationRequest: string
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
    pipe(
      {
        iss: federationEntityMetadata.basePath.href,
        sub: federationEntityMetadata.basePath.href,
        walletInstanceAttestationRequest,
      },
      TE.of,
      TE.chain(signer.createJwtAndsign("entity-statement+jwt"))
    );
