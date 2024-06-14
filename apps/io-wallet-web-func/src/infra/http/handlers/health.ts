import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { CosmosClient } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import {
  getCosmosHealth,
  logErrorAndReturnResponse,
  HealthCheckError,
} from "io-wallet-common";

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
    TE.map(() => undefined),
    TE.mapLeft(({ message }) => new HealthCheckError(message))
  );

export const HealthHandler = H.of(() =>
  pipe(
    getHealthCheck,
    RTE.map(() => ({
      message: "it works!",
    })),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
