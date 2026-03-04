import * as H from "@pagopa/handler-kit";
import { parse, ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/Option";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { ES256PublicJwk, validateJwkKid } from "io-wallet-common/jwk";

import { AssertionValidationConfig } from "@/infra/mobile-attestation-service";
import { validateAssertionRequest } from "@/infra/mobile-attestation-service/assertion-request-validation";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import {
  validateHeaderKidMatchesCnfKid,
  validateIssuerMatchesHardwareKeyTag,
  verifyJwtWithInternalKey,
} from "@/verifier";
import { WalletInstanceEnvironment } from "@/wallet-instance";
import {
  createWalletInstanceAttestation,
  WalletInstanceAttestationData,
  WalletInstanceAttestationEnvironment,
} from "@/wallet-instance-attestation";

const WalletInstanceAttestationRequestBody = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

const AssertionJWTApi = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal("wia-request+jwt"),
  }),
  payload: t.type({
    cnf: t.type({
      jwk: ES256PublicJwk,
    }),
    exp: t.number,
    hardware_key_tag: NonEmptyString,
    hardware_signature: NonEmptyString,
    iat: t.number,
    integrity_assertion: NonEmptyString,
    iss: NonEmptyString,
    nonce: NonEmptyString,
    platform: t.union([t.literal("iOS"), t.literal("Android")]),
    wallet_solution_id: NonEmptyString,
    wallet_solution_version: NonEmptyString,
  }),
});

const AssertionJWTDecoded = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal("wia-request+jwt"),
  }),
  payload: t.type({
    cnf: t.type({
      jwk: ES256PublicJwk,
    }),
    exp: t.number,
    hardwareKeyTag: NonEmptyString,
    hardwareSignature: NonEmptyString,
    iat: t.number,
    integrityAssertion: NonEmptyString,
    iss: NonEmptyString,
    nonce: NonEmptyString,
    platform: t.union([t.literal("iOS"), t.literal("Android")]),
    walletSolutionId: NonEmptyString,
    walletSolutionVersion: NonEmptyString,
  }),
});

const AssertionJWT = new t.Type<
  t.TypeOf<typeof AssertionJWTDecoded>,
  t.TypeOf<typeof AssertionJWTApi>,
  unknown
>(
  "AssertionJWT",
  AssertionJWTDecoded.is,
  (input, context) =>
    pipe(
      AssertionJWTApi.validate(input, context),
      E.map(({ header, payload }) => ({
        header,
        payload: {
          cnf: payload.cnf,
          exp: payload.exp,
          hardwareKeyTag: payload.hardware_key_tag,
          hardwareSignature: payload.hardware_signature,
          iat: payload.iat,
          integrityAssertion: payload.integrity_assertion,
          iss: payload.iss,
          nonce: payload.nonce,
          platform: payload.platform,
          walletSolutionId: payload.wallet_solution_id,
          walletSolutionVersion: payload.wallet_solution_version,
        },
      })),
    ),
  ({ header, payload }) => ({
    header,
    payload: {
      cnf: payload.cnf,
      exp: payload.exp,
      hardware_key_tag: payload.hardwareKeyTag,
      hardware_signature: payload.hardwareSignature,
      iat: payload.iat,
      integrity_assertion: payload.integrityAssertion,
      iss: payload.iss,
      nonce: payload.nonce,
      platform: payload.platform,
      wallet_solution_id: payload.walletSolutionId,
      wallet_solution_version: payload.walletSolutionVersion,
    },
  }),
);

type WIARequest = Omit<
  t.TypeOf<typeof AssertionJWTDecoded>["payload"],
  "exp" | "iat" | "iss"
>;

const verifyAndDecodeWalletInstanceAttestationRequest = (
  walletInstanceAttestationRequest: string,
): TE.TaskEither<ValidationError, WIARequest> =>
  pipe(
    walletInstanceAttestationRequest,
    verifyJwtWithInternalKey,
    TE.chainEitherKW(parse(AssertionJWT)),
    TE.chainFirstEitherKW(validateHeaderKidMatchesCnfKid),
    TE.chainFirstEitherKW(({ payload }) =>
      validateIssuerMatchesHardwareKeyTag(payload),
    ),
    TE.map(({ payload }) => payload),
    TE.mapLeft((error) =>
      error instanceof ValidationError
        ? error
        : new ValidationError([
            error instanceof Error
              ? error.message
              : "Unexpected validation error",
          ]),
    ),
  );

const requireWalletInstanceAttestationRequest = flow(
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
      TE.map((wiaRequest) => ({
        userId: fiscalCode,
        wiaRequest,
      })),
    ),
  ),
);

interface VerifiedAttestationData {
  cnf: {
    jwk: t.TypeOf<typeof ES256PublicJwk>;
  };
  walletSolutionId: NonEmptyString;
  walletSolutionVersion: NonEmptyString;
}

const getWalletInstanceAttestationData =
  (
    verifiedAttestationData: VerifiedAttestationData,
  ): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    WalletInstanceAttestationData
  > =>
  ({
    certificateRepository,
    federationEntity: { basePath },
    signer,
    walletAttestationConfig: { oauthClientSub },
  }) =>
    pipe(
      "EC",
      signer.getFirstPublicKeyByKty,
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.map(({ kid }) => ({
        iss: basePath.href,
        kid,
        oauthClientSub,
        walletInstancePublicKey: verifiedAttestationData.cnf.jwk,
        walletProviderName: basePath.href,
        walletSolutionCertificationInformation: undefined,
        walletSolutionId: verifiedAttestationData.walletSolutionId,
        walletSolutionVersion: verifiedAttestationData.walletSolutionVersion,
      })),
      TE.chain(({ kid, ...data }) =>
        pipe(
          certificateRepository.getCertificateChainByKid(kid),
          TE.chain(
            flow(
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

const verifyAssertion: (input: {
  userId: FiscalCode;
  wiaRequest: WIARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  void
> = ({ userId, wiaRequest }) =>
  validateAssertionRequest({
    assertion: wiaRequest,
    userId,
  });

const generateWalletInstanceAttestation: (request: {
  userId: FiscalCode;
  wiaRequest: WIARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceAttestationEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  {
    wallet_instance_attestation: string;
  }
> = (request) =>
  pipe(
    request,
    verifyAssertion,
    RTE.map(() => ({
      cnf: request.wiaRequest.cnf,
      walletSolutionId: request.wiaRequest.walletSolutionId,
      walletSolutionVersion: request.wiaRequest.walletSolutionVersion,
    })),
    RTE.chainW(getWalletInstanceAttestationData),
    RTE.chainW(createWalletInstanceAttestation),
    RTE.map((walletInstanceAttestation) => ({
      wallet_instance_attestation: walletInstanceAttestation,
    })),
  );

export const CreateWalletInstanceAttestationHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req.body,
      requireWalletInstanceAttestationRequest,
      RTE.fromTaskEither,
      RTE.chain(({ userId, wiaRequest }) =>
        isLoadTestUser(userId)
          ? RTE.right(testWalletInstanceAttestation)
          : generateWalletInstanceAttestation({ userId, wiaRequest }),
      ),
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
