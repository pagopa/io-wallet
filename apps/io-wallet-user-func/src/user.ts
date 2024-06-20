import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { User } from "io-wallet-common/user";

export interface UserRepository {
  getFiscalCodeByUserId: (
    id: string,
  ) => TE.TaskEither<Error, { fiscalCode: FiscalCode }>;
  getOrCreateUserByFiscalCode: (
    fiscalCode: FiscalCode,
  ) => TE.TaskEither<Error, User>;
}

interface UserEnvironment {
  userRepository: UserRepository;
}

export const getUserByFiscalCode: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<UserEnvironment, Error, User> =
  (fiscalCode) =>
  ({ userRepository }) =>
    userRepository.getOrCreateUserByFiscalCode(fiscalCode);
