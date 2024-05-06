import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";

export const User = t.type({
  id: NonEmptyString,
});

export type User = t.TypeOf<typeof User>;

export type UserIdRepository = {
  getUserByFiscalCode: (fiscalCode: FiscalCode) => TE.TaskEither<Error, User>;
  getFiscalCodeByUserId: (
    id: string
  ) => TE.TaskEither<Error, { fiscalCode: FiscalCode }>;
};

export type UserIdEnvironment = {
  userIdRepository: UserIdRepository;
};

export const getUserIdByFiscalCode: (
  fiscalCode: FiscalCode
) => RTE.ReaderTaskEither<UserIdEnvironment, Error, { id: NonEmptyString }> =
  (fiscalCode) =>
  ({ userIdRepository }) =>
    userIdRepository.getUserByFiscalCode(fiscalCode);
