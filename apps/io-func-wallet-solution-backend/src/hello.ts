import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

type HelloWorldEnvironment = {
  myName: string;
};

export const hello =
  (): RTE.ReaderTaskEither<HelloWorldEnvironment, Error, string> =>
  ({ myName }) =>
    pipe(`Hello ${myName}!`, TE.of);
