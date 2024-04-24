import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { logErrorAndReturnResponse } from "../utils";

export const GetUserIdByFiscalCodeHandler = H.of(() =>
  pipe(
    RTE.of("foo"),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
