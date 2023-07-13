import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";

import { logErrorAndReturnResponse } from "../utils";
import { getEntityConfiguration } from "../../../entity-configuration";
import { successJwt } from "./utils";

export const GetEntityConfigurationHandler = H.of(() =>
  pipe(
    RTE.Do,
    RTE.chain(getEntityConfiguration),
    RTE.map(successJwt),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
