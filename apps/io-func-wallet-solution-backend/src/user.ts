import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

export type UserIdRepository = {
  getUserIdByFiscalCode: (
    fiscalCode: FiscalCode
  ) => TE.TaskEither<Error, NonEmptyString>;
  getFiscalCodeByUserId: (id: string) => TE.TaskEither<Error, FiscalCode>;
};

export type UserIdEnvironment = {
  userIdRepository: UserIdRepository;
};

export const getUserIdByFiscalCode: (
  fiscalCode: FiscalCode
) => RTE.ReaderTaskEither<UserIdEnvironment, Error, NonEmptyString> =
  (fiscalCode) =>
  ({ userIdRepository }) =>
    userIdRepository.getUserIdByFiscalCode(fiscalCode);
