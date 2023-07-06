import * as t from "io-ts";

import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { logErrorAndReturnResponse } from "../utils";
import { createWalletInstanceAttestation } from "../../../wallet-instance-attestation";

const WalletInstanceAttestationRequestPayload = t.type({
  grant_type: NonEmptyString,
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
        assertion: E.right(assertion),
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
      RTE.chain(({ assertion }) => createWalletInstanceAttestation(assertion)),
      RTE.map(H.successJson),
      RTE.orElseW(logErrorAndReturnResponse)
    )
);
