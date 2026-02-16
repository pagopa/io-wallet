import * as H from "@pagopa/handler-kit";
import { parse } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/Option";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

import { AttestationService } from "@/attestation-service";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { getPublicKeyFromCnf, verifyAndDecodeJwt } from "@/verifier";
import { createWalletAppAttestation } from "@/wallet-app-attestation";
import {
  WalletAttestations,
  WalletAttestationsEnvironment,
} from "@/wallet-attestations";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";
import { createWalletUnitAttestation } from "@/wallet-unit-attestation";

const WalletAttestationRequestHeader = t.type({
  alg: t.string,
  kid: t.string,
  typ: t.literal("attestations-request+jwt"),
});

const WalletAttestationRequestPayload = t.type({
  attested_key: t.string,
  aud: NonEmptyString,
  cnf: t.type({
    jwk: JwkPublicKey,
  }),
  exp: t.number,
  hardware_key_tag: NonEmptyString,
  hardware_signature: NonEmptyString,
  iat: t.number,
  integrity_assertion: NonEmptyString,
  iss: t.string,
  nonce: NonEmptyString,
});

const WalletAttestationRequest = t.type({
  header: WalletAttestationRequestHeader,
  payload: WalletAttestationRequestPayload,
});

type WalletAttestationRequest = t.TypeOf<typeof WalletAttestationRequest>;

// verify and decode the wallet instance request
const verifyAndDecodeWalletAttestationRequest = (
  walletAttestationRequest: string,
): TE.TaskEither<Error, WalletAttestationRequest> =>
  pipe(
    walletAttestationRequest,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyAndDecodeJwt(walletAttestationRequest)),
    TE.chainEitherKW(parse(WalletAttestationRequest)),
  );

const validateAssertion: (
  walletAttestationRequest: WalletAttestationRequest,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { attestationService: AttestationService },
  Error,
  void
> =
  (walletAttestationRequest, hardwareKey, signCount, user) =>
  ({ attestationService }) =>
    attestationService.validateAssertion({
      hardwareKey,
      hardwareSignature: walletAttestationRequest.payload.hardware_signature,
      integrityAssertion: walletAttestationRequest.payload.integrity_assertion,
      jwk: walletAttestationRequest.payload.cnf.jwk,
      nonce: walletAttestationRequest.payload.nonce,
      signCount,
      user,
    });

interface WalletAttestationData {
  iss: string;
  keyStorage: string[];
  kid: string;
  sub: string;
  userAuthentication: string[];
  walletInstancePublicKey: JwkPublicKey;
  x5c: string[];
}

const getWalletAttestationData =
  (
    walletAttestationRequest: WalletAttestationRequest,
  ): RTE.ReaderTaskEither<
    WalletAttestationsEnvironment,
    Error,
    WalletAttestationData
  > =>
  ({ certificateRepository, federationEntity: { basePath }, signer }) =>
    pipe(
      "EC",
      signer.getFirstPublicKeyByKty,
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.map(({ kid }) => ({
        iss: basePath.href,
        keyStorage: [],
        kid,
        sub: walletAttestationRequest.header.kid,
        userAuthentication: [],
        walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
      })),
      TE.chainW(({ kid, ...data }) =>
        pipe(
          kid,
          certificateRepository.getCertificateChainByKid,
          TE.chainW((maybeCert) =>
            pipe(
              maybeCert,
              O.match(
                () => TE.left(new Error("Certificate chain not found")),
                (chain) => TE.right({ ...data, kid, x5c: chain }),
              ),
            ),
          ),
        ),
      ),
    );

const testWalletAttestations: WalletAttestations = {
  wallet_attestations: {
    wallet_app_attestation: "this_is_a_test_wallet_app_attestation",
    wallet_unit_attestation: "this_is_a_test_wallet_unit_attestation",
  },
};

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
}) =>
  pipe(
    assertion,
    getWalletAttestationData,
    RTE.chainW((walletAttestationData) =>
      pipe(
        sequenceS(RTE.ApplyPar)({
          walletAppAttestation: createWalletAppAttestation(
            walletAttestationData,
          ),
          walletUnitAttestation: createWalletUnitAttestation(
            walletAttestationData,
          ),
        }),
        RTE.map(({ walletAppAttestation, walletUnitAttestation }) =>
          isTestUser
            ? testWalletAttestations
            : {
                wallet_attestations: {
                  wallet_app_attestation: walletAppAttestation,
                  wallet_unit_attestation: walletUnitAttestation,
                },
              },
        ),
      ),
    ),
  );

const WalletAttestationRequestBody = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

const requireWalletAttestationRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletAttestationRequestBody),
    E.map(({ assertion, fiscal_code }) => ({
      assertion,
      fiscalCode: fiscal_code,
    })),
    TE.fromEither,
    TE.chain(({ assertion, fiscalCode }) =>
      pipe(
        assertion,
        verifyAndDecodeWalletAttestationRequest,
        TE.map((validatedAssertion) => ({
          assertion: validatedAssertion,
          userId: fiscalCode,
        })),
      ),
    ),
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

export const CreateWalletAttestationsHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireWalletAttestationRequest,
    TE.map(addIsTestUser),
    RTE.fromTaskEither,
    RTE.chainFirst(validateRequest),
    RTE.chainW(generateWalletAttestations),
    RTE.map(H.successJson),
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createWalletAttestations",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
