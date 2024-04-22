import * as t from "io-ts";

import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { NonceEnvironment, deleteNonce } from "./nonce";

export const WalletInstanceRequest = t.type({
  challenge: NonEmptyString,
  keyAttestation: NonEmptyString,
  hardwareKeyTag: NonEmptyString,
});

export type WalletInstanceRequest = t.TypeOf<typeof WalletInstanceRequest>;

export const validateChallenge = (
  challenge: WalletInstanceRequest["challenge"]
): RTE.ReaderTaskEither<NonceEnvironment, Error, void> =>
  pipe(challenge, deleteNonce);
