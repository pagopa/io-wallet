import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { AttestationService, validateAssertionV2 } from "@/attestation-service";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import {
  createWalletAttestationAsJwt,
  createWalletAttestationAsSdJwt,
  getWalletAttestationData,
} from "@/wallet-attestation";
import { createWalletAttestationAsMdoc } from "@/wallet-attestation-mdoc";
import {
  verifyAndDecodeWalletAttestationRequest,
  WalletAttestationRequestV2,
} from "@/wallet-attestation-request";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";

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
    t.type({
      format: t.literal("mso_mdoc"),
      wallet_attestation: t.string,
    }),
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
    {
      format: "mso_mdoc",
      wallet_attestation: "this_is_a_test_mdoc_attestation",
    },
  ],
};

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
  NonceEnvironment &
    WalletInstanceEnvironment & {
      attestationService: AttestationService;
    },
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

const generateWalletAttestations = ({
  assertion,
  isTestUser,
}: {
  assertion: WalletAttestationRequestV2;
  isTestUser: boolean;
}) =>
  pipe(
    assertion,
    getWalletAttestationData,
    RTE.chainW((walletAttestationData) =>
      pipe(
        sequenceS(RTE.ApplyPar)({
          jwt: createWalletAttestationAsJwt(walletAttestationData),
          msoMdoc: createWalletAttestationAsMdoc(walletAttestationData),
          sdJwt: createWalletAttestationAsSdJwt(walletAttestationData),
        }),
        RTE.map(({ jwt, msoMdoc, sdJwt }) =>
          isTestUser
            ? testWalletAttestations
            : {
                wallet_attestations: [
                  {
                    format: "jwt",
                    wallet_attestation: jwt,
                  },
                  {
                    format: "dc+sd-jwt",
                    wallet_attestation: sdJwt,
                  },
                  {
                    format: "mso_mdoc",
                    wallet_attestation: msoMdoc,
                  },
                ],
              },
        ),
      ),
    ),
  );

const WalletAttestationRequestPayload = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

type WalletAttestationRequestPayload = t.TypeOf<
  typeof WalletAttestationRequestPayload
>;

const requireWalletAttestationRequest = flow(
  H.parse(WalletAttestationRequestPayload),
  E.chain(({ assertion, fiscal_code }) =>
    sequenceS(E.Apply)({
      assertion: E.right(assertion),
      fiscalCode: E.right(fiscal_code),
    }),
  ),
);

const verifyAssertion = ({
  assertion,
  fiscalCode,
}: {
  assertion: string;
  fiscalCode: FiscalCode;
}) =>
  pipe(
    assertion,
    verifyAndDecodeWalletAttestationRequest,
    TE.map((validatedAssertion) => ({
      assertion: validatedAssertion,
      userId: fiscalCode,
    })),
  );

const addIsTestUser = ({
  assertion,
  userId,
}: {
  assertion: WalletAttestationRequestV2;
  userId: FiscalCode;
}) => ({
  assertion,
  isTestUser: isLoadTestUser(userId),
  userId,
});

export const CreateWalletAttestationV2Handler = H.of((req: H.HttpRequest) =>
  pipe(
    req.body,
    requireWalletAttestationRequest,
    TE.fromEither,
    TE.chain(verifyAssertion),
    TE.map(addIsTestUser),
    RTE.fromTaskEither,
    RTE.chainFirst(validateRequest),
    RTE.chainW(generateWalletAttestations),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      pipe(
        error,
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createWalletAttestationV2",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
