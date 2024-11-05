import {
  PidIssuerHealthCheck,
  getPidIssuerHealth,
} from "@/infra/pid-issuer/health-check";
import { CosmosClient } from "@azure/cosmos";
import * as H from "@pagopa/handler-kit";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { identity, pipe } from "fp-ts/function";
import { HealthCheckError } from "io-wallet-common/error";
import { getCosmosHealth } from "io-wallet-common/infra/azure/cosmos/health-check";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const getHealthCheck: RTE.ReaderTaskEither<
  {
    cosmosClient: CosmosClient;
    pidIssuerClient: PidIssuerHealthCheck;
  },
  Error,
  void
> = ({ cosmosClient, pidIssuerClient }) =>
  // It runs multiple health checks in parallel
  pipe(
    [
      pipe({ cosmosClient }, getCosmosHealth),
      pipe({ pidIssuerClient }, getPidIssuerHealth),
    ],
    RA.wilt(T.ApplicativePar)(identity),
    T.chain(({ left: errors }) =>
      pipe(
        errors,
        RA.head,
        O.fold(
          // return undefined in case errors array is empty
          () => TE.right(undefined),
          () => TE.left(errors),
        ),
      ),
    ),
    // It collects the errors, if any
    TE.mapLeft((errors) => new HealthCheckError(errors.join(". "))),
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
