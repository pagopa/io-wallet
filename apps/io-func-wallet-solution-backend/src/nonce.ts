import { randomBytes } from "crypto";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as IO from "fp-ts/lib/IO";

export type NonceRepository = {
  insert: (nonce: string) => Promise<void>;
};

export type NonceEnvironment = {
  nonceRepository: NonceRepository;
};

export const generateNonce: IO.IO<string> = () =>
  randomBytes(32).toString("hex");

export const insertNonce: (
  nonce: string
) => RTE.ReaderTaskEither<NonceEnvironment, Error, void> =
  (nonce) =>
  ({ nonceRepository }) =>
    TE.tryCatch(
      () => nonceRepository.insert(nonce),
      (error) => new Error(`Failed to insert nonce: ${error}`)
    );
