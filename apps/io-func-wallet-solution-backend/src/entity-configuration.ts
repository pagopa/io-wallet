import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

type EntityConfigurationEnvironment = {
  publicKey: string;
};

export const getEntityConfiguration =
  (): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ publicKey }) =>
    pipe(`Hello ${publicKey}!`, TE.of);
