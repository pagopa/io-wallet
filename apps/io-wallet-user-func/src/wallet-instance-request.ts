import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as t from "io-ts";

import { deleteNonce, NonceEnvironment } from "./nonce";

const WalletInstanceRequest = t.type({
  challenge: NonEmptyString,
  fiscalCode: FiscalCode,
  hardwareKeyTag: NonEmptyString,
  keyAttestation: NonEmptyString,
});

export type WalletInstanceRequest = t.TypeOf<typeof WalletInstanceRequest>;

// This function is used for nonce validation. Instead of checking if the nonce exists and then deleting it, we delete it directly to ensure an atomic operation.
export const consumeNonce = (
  challenge: WalletInstanceRequest["challenge"],
): RTE.ReaderTaskEither<NonceEnvironment, Error, void> =>
  pipe(challenge, deleteNonce);
