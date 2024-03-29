import * as t from "io-ts";

import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { logErrorAndReturnResponse } from "../utils";

import { createdEntityStatementJwt } from "./utils";

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
    ),
    RTE.fromEither
  );

export const CreateWalletInstanceHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireWalletInstanceRequest,
    // TODO: [SIW-956] - Add key attestation validation and device registration
    RTE.chain((_walletInstanceRequest) => RTE.right("OK")),
    RTE.map(createdEntityStatementJwt),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
