import * as t from "io-ts";

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

export const WalletInstanceRequest = t.type({
  challenge: NonEmptyString,
  keyAttestation: NonEmptyString,
  hardwareKeyTag: NonEmptyString,
});

export type WalletInstanceRequest = t.TypeOf<typeof WalletInstanceRequest>;

export const verifyWalletInstanceRequest = (
  walletInstanceRequest: WalletInstanceRequest
): E.Either<Error, WalletInstanceRequest> =>
  // TODO: [SIW-964]: Add nonce validation
  pipe(walletInstanceRequest, E.right);
