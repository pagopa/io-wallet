import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

export interface WhitelistedFiscalCodeEnvironment {
  whitelistedFiscalCodeRepository: WhitelistedFiscalCodeRepository;
}

export interface WhitelistedFiscalCodeRepository {
  checkIfFiscalCodeIsWhitelisted: (
    fiscalCode: FiscalCode,
  ) => TE.TaskEither<Error, { whitelisted: boolean; whitelistedAt?: string }>;
  insertWhitelistedFiscalCodes: (
    fiscalCodes: FiscalCode[],
  ) => TE.TaskEither<Error, void>;
}

export const checkIfFiscalCodeIsWhitelisted: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<
  WhitelistedFiscalCodeEnvironment,
  Error,
  { whitelisted: boolean; whitelistedAt?: string }
> =
  (fiscalCode) =>
  ({ whitelistedFiscalCodeRepository }) =>
    pipe(
      whitelistedFiscalCodeRepository.checkIfFiscalCodeIsWhitelisted(
        fiscalCode,
      ),
      TE.map(({ whitelisted, whitelistedAt }) => ({
        whitelisted,
        whitelistedAt,
      })),
    );

export const insertWhitelistedFiscalCodes: (
  fiscalCodes: FiscalCode[],
) => RTE.ReaderTaskEither<WhitelistedFiscalCodeEnvironment, Error, void> =
  (fiscalCodes) =>
  ({ whitelistedFiscalCodeRepository }) =>
    whitelistedFiscalCodeRepository.insertWhitelistedFiscalCodes(fiscalCodes);
