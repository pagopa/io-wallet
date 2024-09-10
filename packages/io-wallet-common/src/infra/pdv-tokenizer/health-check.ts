import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface PdvTokenizerHealthCheck {
  healthCheck: () => TE.TaskEither<Error, boolean>;
}

export const getPdvTokenizerHealth: RTE.ReaderTaskEither<
  {
    pdvTokenizerClient: PdvTokenizerHealthCheck;
  },
  Error,
  true
> = ({ pdvTokenizerClient }) =>
  pipe(
    pdvTokenizerClient.healthCheck(),
    TE.flatMap((isHealth) =>
      !isHealth
        ? TE.left(new Error("pdv-tokenizer-error"))
        : TE.right(isHealth),
    ),
  );
