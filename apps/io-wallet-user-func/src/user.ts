import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { User } from "io-wallet-common/user";

export type UserRepository = {
  getOrCreateUserByFiscalCode: (
    fiscalCode: FiscalCode
  ) => TE.TaskEither<Error, User>;
  getFiscalCodeByUserId: (
    id: string
  ) => TE.TaskEither<Error, { fiscalCode: FiscalCode }>;
};

type UserEnvironment = {
  userRepository: UserRepository;
};

export const getUserByFiscalCode: (
  fiscalCode: FiscalCode
) => RTE.ReaderTaskEither<UserEnvironment, Error, User> =
  (fiscalCode) =>
  ({ userRepository }) =>
    userRepository.getOrCreateUserByFiscalCode(fiscalCode);
