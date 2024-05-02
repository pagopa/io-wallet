import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { logErrorAndReturnResponse } from "../utils";
import { getUserIdByFiscalCode } from "@/user";

const FiscalCodeBody = t.type({
  fiscal_code: FiscalCode,
});

const requireFiscalCode = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(FiscalCodeBody),
    E.map(({ fiscal_code }) => fiscal_code)
  );

export const GetUserIdByFiscalCodeHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireFiscalCode,
    RTE.fromEither,
    RTE.chain(getUserIdByFiscalCode),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
