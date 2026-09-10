import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

export interface WhitelistedFiscalCodeEnvironment {
  whitelistedFiscalCodeRepository: WhitelistedFiscalCodeRepository;
}

export interface WhitelistedFiscalCodeRepository {
  insertWhitelistedFiscalCodes: (
    fiscalCodes: FiscalCode[],
  ) => TE.TaskEither<Error, void>;
}

export const insertWhitelistedFiscalCodes: (
  fiscalCodes: FiscalCode[],
) => RTE.ReaderTaskEither<WhitelistedFiscalCodeEnvironment, Error, void> =
  (fiscalCodes) =>
  ({ whitelistedFiscalCodeRepository }) =>
    whitelistedFiscalCodeRepository.insertWhitelistedFiscalCodes(fiscalCodes);
