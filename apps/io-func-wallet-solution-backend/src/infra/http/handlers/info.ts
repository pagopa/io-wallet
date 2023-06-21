import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";

import { logErrorAndReturnResponse } from "../utils";
import { healthCheck } from "../../../health-check";

export const InfoHandler = H.of(() =>
  pipe(
    RTE.Do,
    RTE.chainTaskEitherK(healthCheck),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
