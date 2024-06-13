import * as t from "io-ts";

import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";

import { logErrorAndReturnResponse } from "@io-wallet/io-wallet/infra/http/utils";
import { requireUser } from "./utils";
import {
  insertWalletInstance,
  revokeUserWalletInstancesExceptOne,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";

import { validateAttestation } from "@/attestation-service";

const WalletInstanceRequestPayload = t.type({
  challenge: NonEmptyString,
  key_attestation: NonEmptyString,
  hardware_key_tag: NonEmptyString,
});

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

const requireWalletInstanceRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceRequestPayload),
    E.chain(({ challenge, key_attestation, hardware_key_tag }) =>
      sequenceS(E.Apply)({
        challenge: E.right(challenge),
        keyAttestation: E.right(key_attestation),
        hardwareKeyTag: E.right(hardware_key_tag),
      })
    )
  );

export const CreateWalletInstanceHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(E.Apply)({
      walletInstanceRequest: requireWalletInstanceRequest(req),
      user: requireUser(req),
    }),
    RTE.fromEither,
    RTE.chain(({ walletInstanceRequest, user }) =>
      pipe(
        consumeNonce(walletInstanceRequest.challenge),
        RTE.chainW(() => validateAttestation(walletInstanceRequest)),
        RTE.chainW(({ hardwareKey }) =>
          insertWalletInstance({
            id: walletInstanceRequest.hardwareKeyTag,
            userId: user.id,
            hardwareKey,
            signCount: 0,
            isRevoked: false,
          })
        ),
        RTE.chainW(() =>
          revokeUserWalletInstancesExceptOne(
            user.id,
            walletInstanceRequest.hardwareKeyTag
          )
        )
      )
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
