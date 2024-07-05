import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface TrialSystemHealthCheck {
  healthCheck: () => TE.TaskEither<Error, boolean>;
}

export const getTrialSystemHealth: RTE.ReaderTaskEither<
  {
    trialSystemClient: TrialSystemHealthCheck;
  },
  Error,
  true
> = ({ trialSystemClient }) =>
  pipe(
    trialSystemClient.healthCheck(),
    TE.flatMap((isHealth) =>
      !isHealth ? TE.left(new Error("trial-system-error")) : TE.right(isHealth),
    ),
  );
