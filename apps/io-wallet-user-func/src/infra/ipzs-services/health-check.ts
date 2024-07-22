import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

export interface IpzsServicesHealthCheck {
  healthCheck: () => TE.TaskEither<Error, boolean>;
}

export const getIpzsServicesHealth: RTE.ReaderTaskEither<
  {
    ipzsServicesClient: IpzsServicesHealthCheck;
  },
  Error,
  true
> = ({ ipzsServicesClient: { healthCheck } }) =>
  pipe(
    healthCheck(),
    TE.flatMap((isHealth) =>
      !isHealth ? TE.left(new Error("ipzs-error")) : TE.right(isHealth),
    ),
  );
