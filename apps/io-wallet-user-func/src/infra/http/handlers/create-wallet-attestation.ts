import { validateAssertion } from "@/attestation-service";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { createWalletAttestation } from "@/wallet-attestation";
import { verifyWalletAttestationRequest } from "@/wallet-attestation-request";
import {
  getValidWalletInstance,
  getValidWalletInstanceByUserId,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";
import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const WalletAttestationRequestPayload = t.intersection([
  t.type({
    assertion: NonEmptyString,
    grant_type: t.literal(GRANT_TYPE_KEY_ATTESTATION),
  }),
  t.partial({
    fiscal_code: FiscalCode,
  }),
]);

type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

const requireWalletAttestationRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletAttestationRequestPayload),
    E.chain(({ assertion, fiscal_code }) =>
      sequenceS(E.Apply)({
        assertion: E.right(assertion),
        fiscalCode: E.right(fiscal_code),
      }),
    ),
  );

export const CreateWalletAttestationHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireWalletAttestationRequest,
    TE.fromEither,
    TE.chain((payload) =>
      pipe(
        payload.assertion,
        verifyWalletAttestationRequest,
        TE.map((assertion) => ({ assertion, fiscalCode: payload.fiscalCode })),
      ),
    ),
    RTE.fromTaskEither,
    RTE.chainW(({ assertion, fiscalCode }) =>
      pipe(
        consumeNonce(assertion.payload.challenge),
        RTE.chainW(() =>
          // it will be possible to use just the second function as well
          fiscalCode
            ? getValidWalletInstanceByUserId(
                assertion.payload.hardware_key_tag,
                fiscalCode,
              )
            : getValidWalletInstance(assertion.payload.hardware_key_tag),
        ),
        RTE.chainW((walletInstance) =>
          fiscalCode && isLoadTestUser(fiscalCode)
            ? RTE.right(undefined)
            : validateAssertion(
                assertion,
                walletInstance.hardwareKey,
                walletInstance.signCount,
                fiscalCode,
              ),
        ),
        RTE.chainW(() => createWalletAttestation(assertion)),
        RTE.map((attestation) =>
          fiscalCode && isLoadTestUser(fiscalCode)
            ? "this_is_a_test_attestation"
            : attestation,
        ),
      ),
    ),
    RTE.map((wallet_attestation) => ({ wallet_attestation })),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      sendExceptionWithBodyToAppInsights(
        error,
        req.body,
        "createWalletAttestation",
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
