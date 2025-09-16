import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface PidIssuerHealthCheck {
  healthCheck: () => TE.TaskEither<Error, boolean>;
}

export const getPidIssuerHealth: RTE.ReaderTaskEither<
  {
    pidIssuerClient: PidIssuerHealthCheck;
  },
  Error,
  true
> = ({ pidIssuerClient: { healthCheck } }) =>
  pipe(
    healthCheck(),
    TE.flatMap((isHealth) =>
      !isHealth ? TE.left(new Error("pid-issuer-error")) : TE.right(isHealth),
    ),
  );
