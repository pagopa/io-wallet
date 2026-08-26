import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECKeyWithKid } from "io-wallet-common/jwk";

export interface KeyRepository {
  getKeyByName: (keyName: string) => TE.TaskEither<Error, O.Option<Key>>;
}

type Key = ECKeyWithKid & {
  certificateChain: string[];
  keyName: string;
};

export const getKey =
  (
    keyName: string,
  ): RTE.ReaderTaskEither<{ keyRepository: KeyRepository }, Error, Key> =>
  ({ keyRepository }) =>
    pipe(
      keyRepository.getKeyByName(keyName),
      TE.chain(TE.fromOption(() => new Error(`Key "${keyName}" not found`))),
    );
