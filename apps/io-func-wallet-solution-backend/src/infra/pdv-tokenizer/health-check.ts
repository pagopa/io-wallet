import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { TokenizerClient } from "./client";

export declare const getTokenizerHealth: RTE.ReaderTaskEither<
  {
    tokenizerClient: TokenizerClient;
  },
  Error,
  true
>;
