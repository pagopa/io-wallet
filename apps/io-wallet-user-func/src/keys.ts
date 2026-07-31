import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECKeyWithKid } from "io-wallet-common/jwk";

export interface Key {
  certificateChain: string[];
  keyName: string;
  publicKey: ECKeyWithKid;
}

export interface KeyRepository {
  createKey: (key: Key) => TE.TaskEither<Error, void>;
  getKeyByName: (keyName: string) => TE.TaskEither<Error, O.Option<Key>>;
}

export const createKey =
  (
    key: Key,
  ): RTE.ReaderTaskEither<{ keyRepository: KeyRepository }, Error, void> =>
  ({ keyRepository }) =>
    keyRepository.createKey(key);

export const getKey =
  (
    keyName: string,
  ): RTE.ReaderTaskEither<{ keyRepository: KeyRepository }, Error, Key> =>
  ({ keyRepository }) =>
    pipe(
      keyRepository.getKeyByName(keyName),
      TE.chain(TE.fromOption(() => new Error(`Key "${keyName}" not found`))),
    );
