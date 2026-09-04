import { CosmosClient } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { HealthCheckError } from "io-wallet-common/error";
import { getCosmosHealth } from "io-wallet-common/infra/azure/cosmos/health-check";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const getHealthCheck: RTE.ReaderTaskEither<
  {
    cosmosClient: CosmosClient;
  },
  Error,
  void
> = ({ cosmosClient }) =>
  pipe(
    pipe({ cosmosClient }, getCosmosHealth),
    TE.map(() => undefined),
    TE.mapLeft((error) => new HealthCheckError(error.message)),
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
