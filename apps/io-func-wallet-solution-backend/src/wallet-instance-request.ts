import * as t from "io-ts";

import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { NonceEnvironment, deleteNonce } from "./nonce";

const WalletInstanceRequest = t.type({
  challenge: NonEmptyString,
  keyAttestation: NonEmptyString,
  hardwareKeyTag: NonEmptyString,
});

export type WalletInstanceRequest = t.TypeOf<typeof WalletInstanceRequest>;

// This method is used for nonce validation. Instead of checking if the nonce exists and then deleting it, we delete it directly to ensure an atomic operation.
export const consumeNonce = (
  challenge: WalletInstanceRequest["challenge"]
): RTE.ReaderTaskEither<NonceEnvironment, Error, void> =>
  pipe(challenge, deleteNonce);
