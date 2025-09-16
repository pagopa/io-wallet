import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { lookup } from "fp-ts/Record";

export const requireFiscalCodeFromHeader = (req: H.HttpRequest) =>
  pipe(
    req.headers,
    lookup("fiscal-code"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing fiscal-code in header"),
    ),
    E.chainW(
      H.parse(
        FiscalCode,
        "The content of fiscal-code header is not a valid fiscal code",
      ),
    ),
  );

export const requireFiscalCodeFromPath: (
  req: H.HttpRequest,
) => E.Either<Error, FiscalCode> = (req) =>
  pipe(
    req.path,
    lookup("fiscalCode"),
    E.fromOption(
      () => new H.HttpBadRequestError(`Missing "fiscalCode" in path`),
    ),
    E.chainW(
      H.parse(
        FiscalCode,
        `The content of the path parameter is not a valid fiscal code`,
      ),
    ),
  );
