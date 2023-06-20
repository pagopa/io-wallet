import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";

import { logErrorAndReturnResponse } from "../utils";
import { hello } from "../../../hello";

export const HelloWorldHandler = H.of(() =>
  pipe(
    RTE.Do,
    RTE.chain(hello),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
