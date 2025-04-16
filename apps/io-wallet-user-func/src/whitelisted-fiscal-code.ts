import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";

export interface WhitelistedFiscalCodeRepository {
  checkIfFiscalCodeIsWhitelisted: (
    fiscalCode: FiscalCode,
  ) => TE.TaskEither<Error, { whitelisted: boolean; whitelistedAt?: string }>;
}

export interface WhitelistedFiscalCodeEnvironment {
  whitelistedFiscalCodeRepository: WhitelistedFiscalCodeRepository;
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
