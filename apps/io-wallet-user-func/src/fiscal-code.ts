import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";

export interface FiscalCodeRepository {
  getFiscalCodeWhitelisted: (
    fiscalCode: FiscalCode,
  ) => TE.TaskEither<Error, { whitelisted: boolean; whitelistedAt?: string }>;
}

export interface FiscalCodeEnvironment {
  fiscalCodeRepository: FiscalCodeRepository;
}

export const getFiscalCodeWhitelisted: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<
  FiscalCodeEnvironment,
  Error,
  { whitelisted: boolean; whitelistedAt?: string }
> =
  (fiscalCode) =>
  ({ fiscalCodeRepository }) =>
    pipe(
      fiscalCodeRepository.getFiscalCodeWhitelisted(fiscalCode),
      TE.map(({ whitelisted, whitelistedAt }) => ({
        whitelisted,
        whitelistedAt,
      })),
    );
