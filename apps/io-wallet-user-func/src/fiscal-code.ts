import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { EntityNotFoundError } from "io-wallet-common/error";

export interface FiscalCodeRepository {
  isFiscalCodeWhitelisted: (
    fiscalCode: NonEmptyString,
  ) => TE.TaskEither<Error, boolean>;
}

export interface FiscalCodeEnvironment {
  fiscalCodeRepository: FiscalCodeRepository;
}

export const checkFiscalCodeWhitelist: (
  fiscalCode: NonEmptyString,
) => RTE.ReaderTaskEither<FiscalCodeEnvironment, Error, void> =
  (fiscalCode) =>
  ({ fiscalCodeRepository }) =>
    pipe(
      fiscalCodeRepository.isFiscalCodeWhitelisted(fiscalCode),
      TE.chain((result) =>
        result
          ? TE.right(void 0)
          : TE.left(new EntityNotFoundError("Fiscal code not found")),
      ),
    );
