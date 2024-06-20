import { validateAttestation } from "@/attestation-service";
import {
  insertWalletInstance,
  revokeUserWalletInstancesExceptOne,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/http-response";

import { requireUser } from "./utils";

const WalletInstanceRequestPayload = t.type({
  challenge: NonEmptyString,
  hardware_key_tag: NonEmptyString,
  key_attestation: NonEmptyString,
});

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

const requireWalletInstanceRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceRequestPayload),
    E.chain(({ challenge, hardware_key_tag, key_attestation }) =>
      sequenceS(E.Apply)({
        challenge: E.right(challenge),
        hardwareKeyTag: E.right(hardware_key_tag),
        keyAttestation: E.right(key_attestation),
      }),
    ),
  );

export const CreateWalletInstanceHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(E.Apply)({
      user: requireUser(req),
      walletInstanceRequest: requireWalletInstanceRequest(req),
    }),
    RTE.fromEither,
    RTE.chain(({ user, walletInstanceRequest }) =>
      pipe(
        consumeNonce(walletInstanceRequest.challenge),
        RTE.chainW(() => validateAttestation(walletInstanceRequest)),
        RTE.chainW(({ hardwareKey }) =>
          insertWalletInstance({
            createdAt: new Date(), // side effect
            hardwareKey,
            id: walletInstanceRequest.hardwareKeyTag,
            isRevoked: false,
            signCount: 0,
            userId: user.id,
          }),
        ),
        RTE.chainW(() =>
          revokeUserWalletInstancesExceptOne(
            user.id,
            walletInstanceRequest.hardwareKeyTag,
          ),
        ),
      ),
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
