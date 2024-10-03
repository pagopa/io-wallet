import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { readableReportSimplified } from "@pagopa/ts-commons/lib/reporters";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RE from "fp-ts/ReaderEither";
import { lookup } from "fp-ts/Record";
import { pipe } from "fp-ts/function";

export const readFromEnvironment =
  (variableName: string) => (env: NodeJS.ProcessEnv) =>
    pipe(
      env,
      lookup(variableName),
      O.chain(O.fromNullable),
      E.fromOption(
        () => new Error(`unable to find "${variableName}" in node environment`),
      ),
    );

export const stringToNumberDecoderRE = (
  variableName: string,
): RE.ReaderEither<unknown, Error, number> =>
  pipe(
    variableName,
    NumberFromString.decode,
    RE.fromEither,
    RE.mapLeft((errs) => new Error(readableReportSimplified(errs))),
  );
