import { randomBytes } from "crypto";
import * as IOE from "fp-ts/IOEither";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";

export interface NonceRepository {
  delete: (nonce: string) => TE.TaskEither<Error, void>;
  insert: (nonce: string) => TE.TaskEither<Error, void>;
}

export interface NonceEnvironment {
  nonceRepository: NonceRepository;
}

export const generateNonce: IOE.IOEither<Error, string> = IOE.tryCatch(
  () => randomBytes(32).toString("hex"),
  (error) => new Error(`Failed to generate nonce: ${error}`)
);

export const insertNonce: (
  nonce: string
) => RTE.ReaderTaskEither<NonceEnvironment, Error, void> =
  (nonce) =>
  ({ nonceRepository }) =>
    nonceRepository.insert(nonce);

export const deleteNonce: (
  nonce: string
) => RTE.ReaderTaskEither<NonceEnvironment, Error, void> =
  (nonce) =>
  ({ nonceRepository }) =>
    nonceRepository.delete(nonce);
