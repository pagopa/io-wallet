import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";

import { logErrorAndReturnResponse } from "../utils";
import { successEntityStatementJwt } from "./utils";
import { getEntityConfiguration } from "@/entity-configuration";

export const GetEntityConfigurationHandler = H.of(() =>
  pipe(
    getEntityConfiguration,
    RTE.map(successEntityStatementJwt),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
