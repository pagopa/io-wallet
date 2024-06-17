import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

export const User = t.type({
  id: NonEmptyString,
});

export type User = t.TypeOf<typeof User>;

export interface UserRepository {
  getFiscalCodeByUserId: (
    id: string
  ) => TE.TaskEither<Error, { fiscalCode: FiscalCode }>;
  getOrCreateUserByFiscalCode: (
    fiscalCode: FiscalCode
  ) => TE.TaskEither<Error, User>;
}

interface UserEnvironment {
  userRepository: UserRepository;
}

export const getUserByFiscalCode: (
  fiscalCode: FiscalCode
) => RTE.ReaderTaskEither<UserEnvironment, Error, User> =
  (fiscalCode) =>
  ({ userRepository }) =>
    userRepository.getOrCreateUserByFiscalCode(fiscalCode);
