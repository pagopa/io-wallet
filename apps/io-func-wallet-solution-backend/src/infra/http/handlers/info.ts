import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import * as H from "@pagopa/handler-kit";
import { logErrorAndReturnResponse } from "../utils";
import { getCosmosHealth } from "@/infra/azure/cosmos/health-check";

export const InfoHandler = H.of(() =>
  pipe(
    getCosmosHealth,
    RTE.map(() => ({
      message: "it works!",
    })),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
