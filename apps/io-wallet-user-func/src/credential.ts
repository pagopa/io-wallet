import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface CredentialRepository {
  revokeAllCredentials: (fiscalCode: FiscalCode) => TE.TaskEither<Error, void>;
}

// tt
export const revokeAllCredentials: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<
  { credentialRepository: CredentialRepository },
  Error,
  void
> =
  (fiscalCode) =>
  ({ credentialRepository }) =>
    credentialRepository.revokeAllCredentials(fiscalCode);
