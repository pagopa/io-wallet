import { checkUserSubscription, getUserByFiscalCode } from "@/user";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { UnauthorizedError, logErrorAndReturnResponse } from "../response";

const FiscalCodeBody = t.type({
  fiscal_code: FiscalCode,
});

const requireFiscalCode = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(FiscalCodeBody),
    E.map(({ fiscal_code }) => fiscal_code),
  );

export const GetUserByFiscalCodeHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireFiscalCode,
    RTE.fromEither,
    // in requireFiscalCode?
    RTE.chain(getUserByFiscalCode),
    RTE.chainFirstW(
      flow(
        checkUserSubscription,
        RTE.mapLeft(() => new UnauthorizedError()),
      ),
    ),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
