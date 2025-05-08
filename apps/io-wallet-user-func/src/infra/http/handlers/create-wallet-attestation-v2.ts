import { AttestationService, validateAssertionV2 } from "@/attestation-service";
import { NonceEnvironment } from "@/nonce";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import {
  createWalletAttestationAsJwt,
  // createWalletAttestationAsMdoc,
  createWalletAttestationAsSdJwt,
} from "@/wallet-attestation";
import {
  WalletAttestationRequestV2,
  verifyAndDecodeWalletAttestationRequest,
} from "@/wallet-attestation-request";
import {
  WalletInstanceEnvironment,
  getValidWalletInstanceByUserId,
  getWalletInstanceUserId,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const WalletAttestationRequestPayload = t.type({
  assertion: NonEmptyString,
});

export const WalletAttestations = t.type({
  wallet_attestations: t.tuple([
    t.type({
      format: t.literal("jwt"),
      wallet_attestation: t.string,
    }),
    t.type({
      format: t.literal("dc+sd-jwt"),
      wallet_attestation: t.string,
    }),
    // t.type({
    //   format: t.literal("mso_mdoc"),
    //   wallet_attestation: t.string,
    // }),
  ]),
});

type WalletAttestations = t.TypeOf<typeof WalletAttestations>;

const testWalletAttestations: WalletAttestations = {
  wallet_attestations: [
    {
      format: "jwt",
      wallet_attestation: "this_is_a_test_jwt_attestation",
    },
    {
      format: "dc+sd-jwt",
      wallet_attestation: "this_is_a_test_sd_jwt_attestation",
    },
    // {
    //   format: "mso_mdoc",
    //   wallet_attestation: "this_is_a_test_mdoc_attestation",
    // },
  ],
};

const getAssertionFromRequest = flow(
  H.parse(WalletAttestationRequestPayload),
  E.map(({ assertion }) => assertion),
  TE.fromEither,
  TE.chain(verifyAndDecodeWalletAttestationRequest),
);

const enrichAssertionWithUserContext = (
  assertion: WalletAttestationRequestV2,
) =>
  pipe(
    RTE.of(assertion),
    RTE.bindTo("assertion"),
    RTE.bind("userId", ({ assertion }) =>
      pipe(
        getWalletInstanceUserId(assertion.payload.hardware_key_tag),
        RTE.map(({ userId }) => userId),
      ),
    ),
    RTE.bind("isTestUser", ({ userId }) => RTE.of(isLoadTestUser(userId))),
  );

/**
 * Validates the wallet attestation request by performing the following steps:
 * 1. Consumes the nonce from the request
 * 2. Retrieves the wallet instance associated with the attestation request and verifies it hasn't been revoked
 * 3. For non-test users, validates the assertion in the request
 */
const validateRequest: (input: {
  assertion: WalletAttestationRequestV2;
  isTestUser: boolean;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  {
    attestationService: AttestationService;
  } & NonceEnvironment &
    WalletInstanceEnvironment,
  Error,
  void
> = ({ assertion, isTestUser, userId }) =>
  pipe(
    assertion.payload.nonce,
    consumeNonce,
    RTE.chainW(() =>
      getValidWalletInstanceByUserId(
        assertion.payload.hardware_key_tag,
        userId,
      ),
    ),
    RTE.chain((walletInstance) =>
      isTestUser
        ? RTE.right(undefined)
        : validateAssertionV2(
            assertion,
            walletInstance.hardwareKey,
            walletInstance.signCount,
            userId,
          ),
    ),
  );

const sendExpectionToAppInsights = (error: Error, requestBody: unknown) =>
  sendExceptionWithBodyToAppInsights(
    error,
    requestBody,
    "createWalletAttestationV2",
  );

const generateWalletAttestations = ({
  assertion,
  isTestUser,
}: {
  assertion: WalletAttestationRequestV2;
  isTestUser: boolean;
}) =>
  pipe(
    sequenceS(RTE.ApplyPar)({
      "dc+sd-jwt": createWalletAttestationAsSdJwt(assertion),
      jwt: createWalletAttestationAsJwt(assertion),
      // mso_mdoc: createWalletAttestationAsMdoc(assertion),
    }),
    RTE.map((results) =>
      isTestUser
        ? testWalletAttestations
        : {
            wallet_attestations: [
              {
                format: "jwt",
                wallet_attestation: results.jwt,
              },
              {
                format: "dc+sd-jwt",
                wallet_attestation: results["dc+sd-jwt"],
              },
              // {
              //   format: "mso_mdoc",
              //   wallet_attestation: results.mso_mdoc,
              // },
            ],
          },
    ),
  );

export const CreateWalletAttestationV2Handler = H.of((req: H.HttpRequest) =>
  pipe(
    req.body,
    getAssertionFromRequest,
    RTE.fromTaskEither,
    RTE.chainW(enrichAssertionWithUserContext),
    RTE.chainFirst(validateRequest),
    RTE.chainW(generateWalletAttestations),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) => sendExpectionToAppInsights(error, req.body)),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
