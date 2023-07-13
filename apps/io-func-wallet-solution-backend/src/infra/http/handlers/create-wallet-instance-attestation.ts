import * as t from "io-ts";

import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { logErrorAndReturnResponse } from "../utils";
import { createWalletInstanceAttestation } from "../../../wallet-instance-attestation";
import { GRANT_TYPE_KEY_ATTESTATION } from "../../../wallet-provider";
import { createdJwt } from "./utils";

const WalletInstanceAttestationRequestPayload = t.type({
  grant_type: t.literal(GRANT_TYPE_KEY_ATTESTATION),
  assertion: NonEmptyString,
});

type WalletInstanceAttestationRequestPayload = t.TypeOf<
  typeof WalletInstanceAttestationRequestPayload
>;

const requireWalletInstanceAttestationRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceAttestationRequestPayload),
    E.chain(({ assertion, grant_type }) =>
      sequenceS(E.Apply)({
        walletInstanceAttestationRequest: E.right(assertion),
        grantType: E.right(grant_type),
      })
    ),
    RTE.fromEither
  );

export const CreateWalletInstanceAttestationHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireWalletInstanceAttestationRequest,
      RTE.chain(({ walletInstanceAttestationRequest }) =>
        createWalletInstanceAttestation(walletInstanceAttestationRequest)
      ),
      RTE.map(createdJwt),
      RTE.orElseW(logErrorAndReturnResponse)
    )
);
