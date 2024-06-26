import { CosmosClient } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { constVoid, pipe } from "fp-ts/function";
import {
  HealthCheckError,
  getCosmosHealth,
} from "io-wallet-common/azure-health-check";
import { logErrorAndReturnResponse } from "io-wallet-common/http-response";

const getHealthCheck: RTE.ReaderTaskEither<
  {
    cosmosClient: CosmosClient;
  },
  Error,
  void
> = ({ cosmosClient }) =>
  pipe(
    { cosmosClient },
    getCosmosHealth,
    TE.map(constVoid),
    TE.mapLeft(({ message }) => new HealthCheckError(`Error: ${message}`)),
  );

export const HealthHandler = H.of(() =>
  pipe(
    getHealthCheck,
    RTE.map(() => ({
      message: "it works!",
    })),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
