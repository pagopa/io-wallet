import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { EntityNotFoundError } from "io-wallet-common/error";

export interface FiscalCodeRepository {
  checkByFiscalCode: (
    fiscalCode: NonEmptyString,
  ) => TE.TaskEither<Error, boolean>;
}

export interface FiscalCodeEnvironment {
  fiscalCodeRepository: FiscalCodeRepository;
}

export const checkFiscalCode: (
  fiscalCode: NonEmptyString,
) => RTE.ReaderTaskEither<FiscalCodeEnvironment, Error, boolean> =
  (fiscalCode) =>
  ({ fiscalCodeRepository }) =>
    pipe(
      fiscalCodeRepository.checkByFiscalCode(fiscalCode),
      TE.chain((result) =>
        result
          ? TE.right(true)
          : TE.left(new EntityNotFoundError("Fiscal code not found")),
      ),
    );
