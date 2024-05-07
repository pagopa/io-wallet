import * as t from "io-ts";

import { flow, pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { lookup } from "fp-ts/Record";
import { logErrorAndReturnResponse } from "../utils";

import { insertWalletInstance, validateAttestation } from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import { User } from "@/user";

const WalletInstanceRequestPayload = t.type({
  challenge: NonEmptyString,
  key_attestation: NonEmptyString,
  hardware_key_tag: NonEmptyString,
});

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

const requireUserId = (req: H.HttpRequest) =>
  pipe(
    req.headers,
    lookup("x-iowallet-user-id"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing x-iowallet-user-id in header")
    ),
    E.chainW(
      H.parse(
        User.props.id,
        "The content of x-iowallet-user-id is not a valid id"
      )
    )
  );

const requireUser: (
  req: H.HttpRequest
) => E.Either<H.HttpBadRequestError | H.ValidationError, User> = flow(
  requireUserId,
  E.map((id) => ({ id }))
);

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
        )
      )
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
