import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";

import { logErrorAndReturnResponse } from "../utils";
import { getEntityConfiguration } from "../../../entity-configuration";

export const GetEntityConfigurationHandler = H.of(() =>
  pipe(
    RTE.Do,
    RTE.chainReaderEitherK(getEntityConfiguration),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
