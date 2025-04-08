import { checkFiscalCode } from "@/fiscal-code";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import { lookup } from "fp-ts/Record";
import { pipe } from "fp-ts/function";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

export const requireFiscalCode: (
  req: H.HttpRequest,
) => E.Either<Error, NonEmptyString> = (req) =>
  pipe(
    req.path,
    lookup("fiscalCode"),
    E.fromOption(
      () => new H.HttpBadRequestError(`Missing "fiscalCode" in path`),
    ),
    E.chainW(H.parse(NonEmptyString, `Invalid "fiscalCode" supplied`)),
  );

export const CheckFiscalCodeHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(E.Apply)({
      fiscalCode: pipe(req, requireFiscalCode),
    }),
    RTE.fromEither,
    RTE.chain(({ fiscalCode }) =>
      pipe(
        checkFiscalCode(fiscalCode),
        RTE.map(() => ({})),
      ),
    ),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
