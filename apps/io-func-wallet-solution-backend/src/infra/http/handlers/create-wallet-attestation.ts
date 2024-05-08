import * as t from "io-ts";

import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { logErrorAndReturnResponse } from "../utils";
import { createWalletAttestation } from "../../../wallet-attestation";
import { GRANT_TYPE_KEY_ATTESTATION } from "../../../wallet-provider";
import { createdEntityStatementJwt, requireUser } from "./utils";

const WalletAttestationRequestPayload = t.type({
  grant_type: t.literal(GRANT_TYPE_KEY_ATTESTATION),
  assertion: NonEmptyString,
});

type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

const requireWalletAttestationRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletAttestationRequestPayload),
    E.chain(({ assertion, grant_type }) =>
      sequenceS(E.Apply)({
        assertion: E.right(assertion),
        grantType: E.right(grant_type),
      })
    )
  );

export const CreateWalletAttestationHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(E.Apply)({
      walletAttestationRequest: requireWalletAttestationRequest(req),
      user: requireUser(req),
    }),
    RTE.fromEither,
    RTE.chain(({ walletAttestationRequest }) =>
      pipe(walletAttestationRequest.assertion, createWalletAttestation)
    ),
    RTE.map(createdEntityStatementJwt),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
