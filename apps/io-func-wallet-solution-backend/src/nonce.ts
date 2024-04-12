import { randomBytes } from "crypto";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as IOE from "fp-ts/IOEither";

export type NonceRepository = {
  insert: (nonce: string) => Promise<void>;
};

export type NonceEnvironment = {
  nonceRepository: NonceRepository;
};

export const generateNonce: IOE.IOEither<Error, string> = IOE.tryCatch(
  () => randomBytes(32).toString("hex"),
  (error) => new Error(`Failed to generate nonce: ${error}`)
);

export const insertNonce: (
  nonce: string
) => RTE.ReaderTaskEither<NonceEnvironment, Error, void> =
  (nonce) =>
  ({ nonceRepository }) =>
    TE.tryCatch(
      () => nonceRepository.insert(nonce),
      (error) => new Error(`Failed to insert nonce: ${error}`)
    );
