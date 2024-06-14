import { pipe, identity } from "fp-ts/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { CosmosClient } from "@azure/cosmos";
import * as O from "fp-ts/Option";
import * as H from "@pagopa/handler-kit";
import { getCosmosHealth, logErrorAndReturnResponse } from "io-wallet-common";
import {
  PdvTokenizerHealthCheck,
  getPdvTokenizerHealth,
} from "@/infra/pdv-tokenizer/health-check";

class HealthCheckError extends Error {
  name = "HealthCheckError";
  constructor(cause?: string) {
    super(`The function is not healthy. ${cause}`);
  }
}

const getHealthCheck: RTE.ReaderTaskEither<
  {
    cosmosClient: CosmosClient;
    pdvTokenizerClient: PdvTokenizerHealthCheck;
  },
  Error,
  void
> = ({ cosmosClient, pdvTokenizerClient }) =>
  // It runs multiple health checks in parallel
  pipe(
    [
      pipe({ cosmosClient }, getCosmosHealth),
      pipe({ pdvTokenizerClient }, getPdvTokenizerHealth),
    ],
    RA.wilt(T.ApplicativePar)(identity),
    T.chain(({ left: errors }) =>
      pipe(
        errors,
        RA.head,
        O.fold(
          // return undefined in case errors array is empty
          () => TE.right(undefined),
          () => TE.left(errors)
        )
      )
    ),
    // It collects the errors, if any
    TE.mapLeft((errors) => new HealthCheckError(errors.join(". ")))
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
