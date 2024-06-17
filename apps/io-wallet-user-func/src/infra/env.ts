import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { lookup } from "fp-ts/lib/Record";
import { pipe } from "fp-ts/lib/function";

export const readFromEnvironment =
  (variableName: string) => (env: NodeJS.ProcessEnv) =>
    pipe(
      env,
      lookup(variableName),
      O.chain(O.fromNullable),
      E.fromOption(
        () => new Error(`unable to find "${variableName}" in node environment`)
      )
    );
