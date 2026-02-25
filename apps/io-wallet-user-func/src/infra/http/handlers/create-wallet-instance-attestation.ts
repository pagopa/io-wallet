import * as H from "@pagopa/handler-kit";
import { parse } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
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
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import {
  createWalletInstanceAttestation,
  WalletInstanceAttestationEnvironment,
} from "@/wallet-instance-attestation";
import { consumeNonce } from "@/wallet-instance-request";

const WalletInstanceAttestationRequestHeader = t.type({
  alg: t.literal("ES256"),
  kid: t.string,
  typ: t.literal("wia-request+jwt"),
});

const WalletInstanceAttestationRequestPayload = t.type({
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
  platform: t.literal("iOS", "Android"),
  wallet_solution_id: t.string,
  wallet_solution_version: t.string,
});

const WalletInstanceAttestationRequest = t.type({
  header: WalletInstanceAttestationRequestHeader,
  payload: WalletInstanceAttestationRequestPayload,
});

type WalletInstanceAttestationRequest = t.TypeOf<
  typeof WalletInstanceAttestationRequest
>;

const verifyAndDecodeWalletInstanceAttestationRequest = (
  walletInstanceAttestationRequest: string,
): TE.TaskEither<Error, WalletInstanceAttestationRequest> =>
  pipe(
    walletInstanceAttestationRequest,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyAndDecodeJwt(walletInstanceAttestationRequest)),
    TE.chainEitherKW(parse(WalletInstanceAttestationRequest)),
  );

const validateAssertion: (
  walletInstanceAttestationRequest: WalletInstanceAttestationRequest,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { attestationService: AttestationService },
  Error,
  void
> =
  (walletInstanceAttestationRequest, hardwareKey, signCount, user) =>
  ({ attestationService }) =>
    attestationService.validateAssertion({
      hardwareKey,
      hardwareSignature:
        walletInstanceAttestationRequest.payload.hardware_signature,
      integrityAssertion:
        walletInstanceAttestationRequest.payload.integrity_assertion,
      jwk: walletInstanceAttestationRequest.payload.cnf.jwk,
      nonce: walletInstanceAttestationRequest.payload.nonce,
      signCount,
      user,
    });

interface WalletInstanceAttestationData {
  iss: string;
  keyStorage: string[];
  kid: string;
  sub: string;
  userAuthentication: string[];
  walletInstancePublicKey: JwkPublicKey;
  x5c: string[];
}

const getWalletInstanceAttestationData =
  (
    walletInstanceAttestationRequest: WalletInstanceAttestationRequest,
  ): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    WalletInstanceAttestationData
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
        sub: walletInstanceAttestationRequest.header.kid,
        userAuthentication: [],
        walletInstancePublicKey:
          walletInstanceAttestationRequest.payload.cnf.jwk,
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

const testWalletInstanceAttestation = {
  wallet_instance_attestation: "this_is_a_test_wallet_instance_attestation",
};

/**
 * Validates the wallet attestation request by performing the following steps:
 * 1. Consumes the nonce from the request
 * 2. Retrieves the wallet instance associated with the attestation request and verifies it hasn't been revoked
 * 3. For non-test users, validates the assertion in the request
 */
const validateRequest: (input: {
  assertion: WalletInstanceAttestationRequest;
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

const generateWalletInstanceAttestation = ({
  assertion,
  isTestUser,
}: {
  assertion: WalletInstanceAttestationRequest;
  isTestUser: boolean;
}) =>
  pipe(
    assertion,
    getWalletInstanceAttestationData,
    RTE.chainW(
      flow(
        createWalletInstanceAttestation,
        RTE.map((walletInstanceAttestation) =>
          isTestUser
            ? testWalletInstanceAttestation
            : {
                wallet_instance_attestation: walletInstanceAttestation,
              },
        ),
      ),
    ),
  );

const WalletInstanceAttestationRequestBody = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

const requireWalletInstanceAttestationRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceAttestationRequestBody),
    E.map(({ assertion, fiscal_code }) => ({
      assertion,
      fiscalCode: fiscal_code,
    })),
    TE.fromEither,
    TE.chain(({ assertion, fiscalCode }) =>
      pipe(
        assertion,
        verifyAndDecodeWalletInstanceAttestationRequest,
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
  assertion: WalletInstanceAttestationRequest;
  userId: FiscalCode;
}) => ({
  assertion,
  isTestUser: isLoadTestUser(userId),
  userId,
});

export const CreateWalletInstanceAttestationHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireWalletInstanceAttestationRequest,
      TE.map(addIsTestUser),
      RTE.fromTaskEither,
      RTE.chainFirst(validateRequest),
      RTE.chainW(generateWalletInstanceAttestation),
      RTE.map(H.successJson),
      RTE.orElseFirstW(
        flow(
          sendTelemetryExceptionWithBody({
            body: req.body,
            functionName: "createWalletInstanceAttestation",
          }),
          RTE.fromEither,
        ),
      ),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
