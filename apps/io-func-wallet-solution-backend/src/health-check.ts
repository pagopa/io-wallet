import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

// It is scaffolding!
export const healthCheck = (): TE.TaskEither<Error, string> =>
  pipe(`It's working!`, TE.of);
