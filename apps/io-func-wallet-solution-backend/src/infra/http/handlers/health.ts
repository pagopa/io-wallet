import { pipe, identity } from "fp-ts/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import { CosmosClient } from "@azure/cosmos";
import * as O from "fp-ts/Option";
import * as H from "@pagopa/handler-kit";
import { logErrorAndReturnResponse } from "../utils";
import {
  PdvTokenizerHealthCheck,
  getPdvTokenizerHealth,
} from "@/infra/pdv-tokenizer/health-check";
import { getCosmosHealth } from "@/infra/azure/cosmos/health-check";

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
    // If there are no errors => `left` is an empty array => return TE.right
    // If there are errors => `left` contains the errors => return TE.left
    T.chain(({ errors }) =>
      pipe(
        left,
        RA.head,
        O.fold(
          () => TE.right(undefined),
          () => TE.left(left)
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
