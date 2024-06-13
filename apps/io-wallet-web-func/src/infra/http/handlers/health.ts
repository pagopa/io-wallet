import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { CosmosClient } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import { getCosmosHealth } from "@io-wallet/io-wallet/infra/azure/cosmos/health-check"; // lungo: fare bundle? su io-sign non c'è
import { logErrorAndReturnResponse } from "@io-wallet/io-wallet/infra/http/utils";

// c'è anche in user-func
class HealthCheckError extends Error {
  name = "HealthCheckError";
  constructor(cause?: string) {
    super(`The function is not healthy. ${cause}`);
  }
}

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
    TE.map(() => undefined), // constVoid?
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

// ho aggiunto due workspaces: controlla
