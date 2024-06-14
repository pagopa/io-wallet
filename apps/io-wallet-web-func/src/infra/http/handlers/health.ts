import { CosmosClient } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import {
  HealthCheckError,
  getCosmosHealth,
  logErrorAndReturnResponse,
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
    TE.mapLeft(({ message }) => new HealthCheckError(message)),
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
