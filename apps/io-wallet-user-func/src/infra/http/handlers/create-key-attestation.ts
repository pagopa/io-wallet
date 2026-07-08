import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { areJwksEqual, ECKey, JwkPublicKey } from "io-wallet-common/jwk";
import { type ECPrivateKeyWithKid } from "io-wallet-common/jwk";
import {
  WalletInstanceStatus,
  WalletInstanceValid,
} from "io-wallet-common/wallet-instance";
import { type JWTPayload } from "jose";

import { CertificateRepository } from "@/certificates";
import { FederationEntity } from "@/entity-configuration";
import { signJwt } from "@/infra/crypto/signer";
import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  IntegrityCheckError,
  toKeysThumbprints,
} from "@/infra/mobile-attestation-service";
import { verifyAndroidAttestation } from "@/infra/mobile-attestation-service";
import { validateKeyAttestationAssertionAndGetWalletInstance } from "@/infra/mobile-attestation-service/assertion-request-validation";
import {
  AttestedKey,
  KeyAttestationData,
  KeyAttestationToJwtModel,
} from "@/key-attestation";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { buildUrl } from "@/url";
import { isLoadTestUser } from "@/user";
import { WalletInstanceEnvironment } from "@/wallet-instance";

import {
  KeyAttestationRequest,
  requireKeyAttestationRequest,
} from "../key-attestation-request";

interface KeyAttestationEnvironment {
  certificateRepository: CertificateRepository;
  federationEntity: FederationEntity;
  keyAttestationSigningKey: ECPrivateKeyWithKid;
  statusListBaseUrl: string;
}

const signKeyAttestation =
  ({
    payload,
    x5c,
  }: {
    payload: JWTPayload;
    x5c: string[];
  }): RTE.ReaderTaskEither<KeyAttestationEnvironment, Error, string> =>
  ({ keyAttestationSigningKey }) =>
    signJwt(keyAttestationSigningKey)({
      duration: "1y",
      header: {
        typ: "key-attestation+jwt",
        x5c,
      },
      payload,
    });

const getKeyAttestationData =
  ({
    attestedKeys,
    platform,
    walletInstanceStatus,
    // walletSolutionVersion,
  }: {
    attestedKeys: readonly AttestedKey[];
    platform: KeyAttestationRequest["platform"];
    walletInstanceStatus: WalletInstanceStatus;
    // walletSolutionVersion: NonEmptyString;
  }): RTE.ReaderTaskEither<
    KeyAttestationEnvironment,
    Error,
    KeyAttestationData
  > =>
  ({
    certificateRepository,
    federationEntity: { basePathV13: basePath },
    keyAttestationSigningKey,
    statusListBaseUrl,
  }) =>
    pipe(
      certificateRepository.getCertificateChainByKid(
        keyAttestationSigningKey.kid,
      ),
      TE.chain(TE.fromOption(() => new Error("Certificate chain not found"))),
      TE.map((x5c) => ({
        attestedKeys,
        kid: keyAttestationSigningKey.kid,
        platform,
        status: {
          statusList: {
            idx: walletInstanceStatus.index,
            uri: buildUrl(walletInstanceStatus.statusListId, statusListBaseUrl),
          },
        },
        walletProviderName: basePath.href,
        // walletSolutionVersion,
        x5c,
      })),
    );

const requireWalletInstanceStatus = (
  walletInstance: WalletInstanceValid,
): E.Either<Error, WalletInstanceStatus> =>
  pipe(
    walletInstance.status,
    E.fromNullable(new Error("Wallet instance status not found")),
  );

const testKeyAttestation = "this_is_a_test_key_attestation";

const verifyAttestedJwkMatchesCnf = ({
  attestedJwk,
  cnfJwk,
}: {
  attestedJwk: JwkPublicKey;
  cnfJwk: ECKey;
}): TE.TaskEither<IntegrityCheckError, void> =>
  pipe(
    attestedJwk,
    ECKey.decode,
    E.mapLeft(() => new Error()),
    TE.fromEither,
    TE.chain((attestedEs256Jwk) =>
      TE.tryCatch(() => areJwksEqual(attestedEs256Jwk, cnfJwk), E.toError),
    ),
    TE.chain((areEqual) =>
      areEqual ? TE.right(undefined) : TE.left(new Error()),
    ),
    TE.mapLeft(() => new IntegrityCheckError(["Invalid key attestation"])),
  );

const generateKeyAttestation: (request: {
  keyAttestationRequest: KeyAttestationRequest;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  KeyAttestationEnvironment &
    NonceEnvironment &
    WalletInstanceEnvironment & {
      androidAttestationValidationConfig: AndroidAttestationValidationConfig;
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  string
> = ({ keyAttestationRequest, userId }) =>
  pipe(
    validateHardwareAssertionAndGetWalletInstance({
      keyAttestationRequest,
      userId,
    }),
    RTE.chainW(flow(requireWalletInstanceStatus, RTE.fromEither)),
    RTE.bindTo("walletInstanceStatus"),
    RTE.bindW("attestedKeys", () =>
      validateKeysToAttest(keyAttestationRequest),
    ),
    RTE.map(({ attestedKeys, walletInstanceStatus }) => ({
      attestedKeys,
      platform: keyAttestationRequest.platform,
      walletInstanceStatus,
      // walletSolutionVersion: keyAttestationRequest.walletSolutionVersion,
    })),
    RTE.chainW(getKeyAttestationData),
    RTE.chainW((keyAttestationData) =>
      pipe(
        KeyAttestationToJwtModel.encode(keyAttestationData),
        ({ x5c, ...payload }) =>
          signKeyAttestation({ payload: { ...payload }, x5c }),
      ),
    ),
  );

const validateAndroidKeysToAttest: (
  nonce: NonEmptyString,
  keysToAttest: Extract<
    KeyAttestationRequest,
    { platform: "android" }
  >["keysToAttest"],
) => RTE.ReaderTaskEither<
  { androidAttestationValidationConfig: AndroidAttestationValidationConfig },
  Error | IntegrityCheckError,
  readonly AttestedKey[]
> = (nonce, keysToAttest) =>
  pipe(
    keysToAttest,
    RTE.traverseArray(({ jwk: requestJwk, keyAttestation }) =>
      pipe(
        verifyAndroidAttestation(keyAttestation, nonce),
        RTE.chainFirstW(({ jwk: attestedJwk }) =>
          pipe(
            verifyAttestedJwkMatchesCnf({
              attestedJwk,
              cnfJwk: requestJwk,
            }),
            RTE.fromTaskEither,
          ),
        ),
        RTE.map(({ deviceDetails: { keymasterSecurityLevel } }) => ({
          jwk: requestJwk,
          keyStorage:
            keymasterSecurityLevel >= 2
              ? "iso_18045_moderate"
              : "iso_18045_enhanced-basic",
          userAuthentication: "iso_18045_moderate",
        })),
      ),
    ),
  );

const validateIosKeysToAttest: (
  keysToAttest: Extract<
    KeyAttestationRequest,
    { platform: "ios" }
  >["keysToAttest"],
) => RTE.ReaderTaskEither<
  { androidAttestationValidationConfig: AndroidAttestationValidationConfig },
  Error | IntegrityCheckError,
  readonly AttestedKey[]
> = RTE.traverseArray(({ jwk }) =>
  RTE.right({
    jwk,
    keyStorage: "iso_18045_moderate",
    userAuthentication: "iso_18045_moderate",
  }),
);

const validateHardwareAssertionAndGetWalletInstance: (input: {
  keyAttestationRequest: KeyAttestationRequest;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  WalletInstanceValid
> = ({ keyAttestationRequest, userId }) =>
  pipe(
    keyAttestationRequest.keysToAttest.map(({ jwk }) => jwk),
    toKeysThumbprints,
    RTE.fromTaskEither,
    RTE.chainW((keysThumbprints) =>
      validateKeyAttestationAssertionAndGetWalletInstance({
        assertion: {
          ...keyAttestationRequest,
          keysThumbprints,
        },
        userId,
      }),
    ),
  );

const validateKeysToAttest: (
  keyAttestationRequest: KeyAttestationRequest,
) => RTE.ReaderTaskEither<
  { androidAttestationValidationConfig: AndroidAttestationValidationConfig },
  Error | IntegrityCheckError,
  readonly AttestedKey[]
> = (keyAttestationRequest) =>
  keyAttestationRequest.platform === "android"
    ? validateAndroidKeysToAttest(
        keyAttestationRequest.nonce,
        keyAttestationRequest.keysToAttest,
      )
    : validateIosKeysToAttest(keyAttestationRequest.keysToAttest);

export const CreateKeyAttestationHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req.body,
    requireKeyAttestationRequest,
    RTE.fromTaskEither,
    RTE.chain(({ keyAttestationRequest, userId }) =>
      isLoadTestUser(userId)
        ? RTE.right(testKeyAttestation)
        : generateKeyAttestation({ keyAttestationRequest, userId }),
    ),
    RTE.map((keyAttestation) => ({
      key_attestation: keyAttestation,
    })),
    RTE.map(H.successJson),
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createKeyAttestation",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
