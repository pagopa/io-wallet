import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

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
