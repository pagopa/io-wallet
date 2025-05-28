import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface CredentialRepository {
  revokeAllCredentials: (
    fiscalCode: FiscalCode,
    accessToken: string,
  ) => TE.TaskEither<Error, void>;
}

export const revokeAllCredentials: (
  fiscalCode: FiscalCode,
  accessToken: string,
) => RTE.ReaderTaskEither<
  {
    credentialRepository: CredentialRepository;
  },
  Error,
  void
> =
  (fiscalCode, accessToken) =>
  ({ credentialRepository }) =>
    credentialRepository.revokeAllCredentials(fiscalCode, accessToken);
