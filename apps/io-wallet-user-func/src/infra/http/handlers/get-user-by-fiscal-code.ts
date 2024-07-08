import { UnauthorizedError } from "@/error";
import { ensureUserInWhitelist, getUserByFiscalCode } from "@/user";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { logErrorAndReturnResponse } from "../error";

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
    RTE.chain(getUserByFiscalCode),
    RTE.chainFirstW(
      flow(
        ensureUserInWhitelist,
        RTE.mapLeft(() => new UnauthorizedError()),
      ),
    ),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
