import { validateAssertion } from "@/attestation-service";
import { createWalletAttestation } from "@/wallet-attestation";
import { verifyWalletAttestationRequest } from "@/wallet-attestation-request";
import { getValidWalletInstance } from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/http-response";

import { requireUser, successJwt } from "./utils";

const WalletAttestationRequestPayload = t.type({
  assertion: NonEmptyString,
  grant_type: t.literal(GRANT_TYPE_KEY_ATTESTATION),
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
      }),
    ),
  );

export const CreateWalletAttestationHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(TE.ApplicativePar)({
      user: pipe(req, requireUser, TE.fromEither),
      walletAttestationRequest: pipe(
        req,
        requireWalletAttestationRequest,
        TE.fromEither,
        TE.chain((payload) =>
          pipe(payload.assertion, verifyWalletAttestationRequest),
        ),
      ),
    }),
    RTE.fromTaskEither,
    RTE.chain(({ user, walletAttestationRequest }) =>
      pipe(
        consumeNonce(walletAttestationRequest.payload.challenge),
        RTE.chainW(() =>
          getValidWalletInstance(
            walletAttestationRequest.payload.hardware_key_tag,
            user.id,
          ),
        ),
        RTE.chainW((walletInstance) =>
          validateAssertion(
            walletAttestationRequest,
            walletInstance.hardwareKey,
            walletInstance.signCount,
          ),
        ),
        RTE.chainW(() => createWalletAttestation(walletAttestationRequest)),
      ),
    ),
    RTE.map(successJwt),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
