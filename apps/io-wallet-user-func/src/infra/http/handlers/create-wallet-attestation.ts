import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { type JWTPayload } from "jose";

import { AttestationService, validateAssertion } from "@/attestation-service";
import { WalletAttestationToJwtModel } from "@/encoders/wallet-attestation";
import { WalletAttestationData } from "@/encoders/wallet-attestation";
import { FederationEntity } from "@/entity-configuration";
import { signJwt, SignJwtEnvironment } from "@/infra/crypto/signer";
import { getKey, KeyRepository } from "@/keys";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { verifyJwtWithInternalKey } from "@/verifier";
import { WalletAttestationRequest } from "@/wallet-attestation-request";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import { getLoAUri, LoA } from "@/wallet-provider";

const WalletAttestations = t.type({
  wallet_attestations: t.array(
    t.type({
      format: t.literal("jwt"),
      wallet_attestation: t.string,
    }),
  ),
});

type WalletAttestations = t.TypeOf<typeof WalletAttestations>;

const testWalletAttestations: WalletAttestations = {
  wallet_attestations: [
    {
      format: "jwt",
      wallet_attestation: "this_is_a_test_jwt_attestation",
    },
  ],
};

interface WalletAttestationConfig {
  walletLink: string;
  walletName: string;
}

interface WalletAttestationEnvironment extends SignJwtEnvironment {
  federationEntity: FederationEntity;
  keyRepository: KeyRepository;
  walletAttestationConfig: WalletAttestationConfig;
  walletAttestationSigningKeyName: string;
}

const getWalletAttestationData =
  (
    walletAttestationRequest: WalletAttestationRequest,
  ): RTE.ReaderTaskEither<
    WalletAttestationEnvironment,
    Error,
    WalletAttestationData
  > =>
  ({
    federationEntity: { basePathV10: basePath },
    keyRepository,
    walletAttestationConfig: { walletLink, walletName },
    walletAttestationSigningKeyName,
  }) =>
    pipe(
      { keyRepository },
      getKey(walletAttestationSigningKeyName),
      TE.map(({ crv, kid }) => ({
        aal: pipe(basePath, getLoAUri(LoA.basic)),
        crv,
        iss: basePath.href,
        kid,
        sub: walletAttestationRequest.header.kid,
        walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
        walletLink,
        walletName,
      })),
    );

const signWalletAttestation =
  ({
    crv,
    kid,
    payload,
  }: {
    crv: string;
    kid: string;
    payload: JWTPayload;
  }): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  ({ cryptographyClient }) =>
    signJwt({
      crv,
      duration: 60 * 60,
      header: {
        kid,
        typ: "oauth-client-attestation+jwt",
      },
      payload,
    })({ cryptographyClient });

/**
 * Validates the wallet attestation request by performing the following steps:
 * 1. Consumes the nonce from the request
 * 2. Retrieves the wallet instance associated with the attestation request and verifies it hasn't been revoked
 * 3. For non-test users, validates the assertion in the request
 */
const validateRequest: (input: {
  assertion: WalletAttestationRequest;
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
        : validateAssertion(
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
  assertion: WalletAttestationRequest;
  isTestUser: boolean;
}): RTE.ReaderTaskEither<
  WalletAttestationEnvironment,
  Error,
  WalletAttestations
> =>
  pipe(
    assertion,
    getWalletAttestationData,
    RTE.chainW((walletAttestationData) =>
      pipe(
        walletAttestationData,
        WalletAttestationToJwtModel.encode,
        (payload) =>
          signWalletAttestation({
            crv: walletAttestationData.crv,
            kid: walletAttestationData.kid,
            payload: { ...payload },
          }),
        RTE.map((jwt) =>
          isTestUser
            ? testWalletAttestations
            : {
                wallet_attestations: [
                  {
                    format: "jwt",
                    wallet_attestation: jwt,
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
    verifyJwtWithInternalKey,
    TE.chainEitherKW(H.parse(WalletAttestationRequest)),
    TE.map((validatedAssertion) => ({
      assertion: validatedAssertion,
      userId: fiscalCode,
    })),
  );

const addIsTestUser = ({
  assertion,
  userId,
}: {
  assertion: WalletAttestationRequest;
  userId: FiscalCode;
}) => ({
  assertion,
  isTestUser: isLoadTestUser(userId),
  userId,
});

export const CreateWalletAttestationHandler = H.of((req: H.HttpRequest) =>
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
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createWalletAttestation",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
