import { validateAssertion } from "@/attestation-service";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { createWalletAttestation } from "@/wallet-attestation";
import { verifyWalletAttestationRequest } from "@/wallet-attestation-request";
import {
  getValidWalletInstanceByUserId,
  getWalletInstanceUserId,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const WalletAttestationRequestPayload = t.type({
  assertion: NonEmptyString,
  grant_type: t.literal(GRANT_TYPE_KEY_ATTESTATION),
});

type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

const requireAssertion = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletAttestationRequestPayload),
    E.map(({ assertion }) => assertion),
  );

export const CreateWalletAttestationV2Handler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireAssertion,
    TE.fromEither,
    TE.chain((assertion) =>
      pipe(
        assertion,
        verifyWalletAttestationRequest,
        TE.map((assertion) => ({ assertion })),
      ),
    ),
    RTE.fromTaskEither,
    RTE.chainW(({ assertion }) =>
      pipe(
        assertion.payload.challenge,
        consumeNonce,
        RTE.chainW(() =>
          getWalletInstanceUserId(assertion.payload.hardware_key_tag),
        ),
        RTE.chainW(({ id, userId }) =>
          pipe(
            getValidWalletInstanceByUserId(id, userId),
            RTE.chainW((walletInstance) =>
              isLoadTestUser(userId)
                ? RTE.right(undefined)
                : validateAssertion(
                    assertion,
                    walletInstance.hardwareKey,
                    walletInstance.signCount,
                    userId,
                  ),
            ),
            RTE.chainW(() => createWalletAttestation(assertion)),
            RTE.map((attestation) =>
              isLoadTestUser(userId)
                ? "this_is_a_test_attestation"
                : attestation,
            ),
          ),
        ),
      ),
    ),
    RTE.map((wallet_attestation) => ({ wallet_attestation })),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      sendExceptionWithBodyToAppInsights(
        error,
        req.body,
        "createWalletAttestationV2",
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
