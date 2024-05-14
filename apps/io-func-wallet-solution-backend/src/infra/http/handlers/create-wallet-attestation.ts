import * as t from "io-ts";

import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { logErrorAndReturnResponse } from "../utils";
import { createdEntityStatementJwt, requireUser } from "./utils";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";
import { verifyWalletAttestationRequest } from "@/wallet-attestation-request";
import { consumeNonce } from "@/wallet-instance-request";
import { createWalletAttestation } from "@/wallet-attestation";
import { getValidWalletInstance } from "@/wallet-instance";
import { validateAssertion } from "@/attestation-service";

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
    sequenceS(TE.ApplicativePar)({
      walletAttestationRequest: pipe(
        req,
        requireWalletAttestationRequest,
        TE.fromEither,
        TE.chain((payload) =>
          pipe(payload.assertion, verifyWalletAttestationRequest)
        )
      ),
      user: pipe(req, requireUser, TE.fromEither),
    }),
    RTE.fromTaskEither,
    RTE.chain(({ walletAttestationRequest, user }) =>
      pipe(
        consumeNonce(walletAttestationRequest.payload.challenge),
        RTE.chainW(() =>
          getValidWalletInstance(
            walletAttestationRequest.payload.hardware_key_tag,
            user.id
          )
        ),
        RTE.chainW((walletInstance) =>
          validateAssertion(
            walletAttestationRequest,
            walletInstance.hardwareKey,
            walletInstance.signCount
          )
        ),
        RTE.chainW(() => createWalletAttestation(walletAttestationRequest))
      )
    ),
    RTE.map(createdEntityStatementJwt),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
