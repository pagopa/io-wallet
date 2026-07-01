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
import { validateWalletUnitAssertionAndGetWalletInstance } from "@/infra/mobile-attestation-service/assertion-request-validation";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { buildUrl } from "@/url";
import { isLoadTestUser } from "@/user";
import { WalletInstanceEnvironment } from "@/wallet-instance";
import {
  AttestedKey,
  WalletUnitAttestationData,
  WalletUnitAttestationToJwtModel,
} from "@/wallet-unit-attestation";

import {
  requireWalletUnitAttestationRequest,
  WUARequest,
} from "../wallet-unit-attestation-request";

interface WalletUnitAttestationEnvironment {
  certificateRepository: CertificateRepository;
  federationEntity: FederationEntity;
  statusListBaseUrl: string;
  walletUnitAttestationSigningKey: ECPrivateKeyWithKid;
}

const signWalletUnitAttestation =
  ({
    payload,
    x5c,
  }: {
    payload: JWTPayload;
    x5c: string[];
  }): RTE.ReaderTaskEither<WalletUnitAttestationEnvironment, Error, string> =>
  ({ walletUnitAttestationSigningKey }) =>
    signJwt(walletUnitAttestationSigningKey)({
      duration: "1y",
      header: {
        typ: "key-attestation+jwt",
        x5c,
      },
      payload,
    });

const getWalletUnitAttestationData =
  ({
    attestedKeys,
    platform,
    walletInstanceStatus,
    // walletSolutionVersion,
  }: {
    attestedKeys: readonly AttestedKey[];
    platform: WUARequest["platform"];
    walletInstanceStatus: WalletInstanceStatus;
    // walletSolutionVersion: NonEmptyString;
  }): RTE.ReaderTaskEither<
    WalletUnitAttestationEnvironment,
    Error,
    WalletUnitAttestationData
  > =>
  ({
    certificateRepository,
    federationEntity: { basePathV13: basePath },
    statusListBaseUrl,
    walletUnitAttestationSigningKey,
  }) =>
    pipe(
      certificateRepository.getCertificateChainByKid(
        walletUnitAttestationSigningKey.kid,
      ),
      TE.chain(TE.fromOption(() => new Error("Certificate chain not found"))),
      TE.map((x5c) => ({
        attestedKeys,
        kid: walletUnitAttestationSigningKey.kid,
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

const testWalletUnitAttestation = "this_is_a_test_wallet_unit_attestation";

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

const generateWalletUnitAttestation: (request: {
  userId: FiscalCode;
  wuaRequest: WUARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment &
    WalletUnitAttestationEnvironment & {
      androidAttestationValidationConfig: AndroidAttestationValidationConfig;
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  string
> = ({ userId, wuaRequest }) =>
  pipe(
    validateHardwareAssertionAndGetWalletInstance({ userId, wuaRequest }),
    RTE.chainW(flow(requireWalletInstanceStatus, RTE.fromEither)),
    RTE.bindTo("walletInstanceStatus"),
    RTE.bindW("attestedKeys", () => validateKeysToAttest(wuaRequest)),
    RTE.map(({ attestedKeys, walletInstanceStatus }) => ({
      attestedKeys,
      platform: wuaRequest.platform,
      walletInstanceStatus,
      // walletSolutionVersion: wuaRequest.walletSolutionVersion,
    })),
    RTE.chainW(getWalletUnitAttestationData),
    RTE.chainW((walletUnitAttestationData) =>
      pipe(
        WalletUnitAttestationToJwtModel.encode(walletUnitAttestationData),
        ({ x5c, ...payload }) =>
          signWalletUnitAttestation({ payload: { ...payload }, x5c }),
      ),
    ),
  );

const validateAndroidKeysToAttest: (
  nonce: NonEmptyString,
  keysToAttest: Extract<WUARequest, { platform: "android" }>["keysToAttest"],
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
  keysToAttest: Extract<WUARequest, { platform: "ios" }>["keysToAttest"],
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
  userId: FiscalCode;
  wuaRequest: WUARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  WalletInstanceValid
> = ({ userId, wuaRequest }) =>
  pipe(
    wuaRequest.keysToAttest.map(({ jwk }) => jwk),
    toKeysThumbprints,
    RTE.fromTaskEither,
    RTE.chainW((keysThumbprints) =>
      validateWalletUnitAssertionAndGetWalletInstance({
        assertion: {
          ...wuaRequest,
          keysThumbprints,
        },
        userId,
      }),
    ),
  );

const validateKeysToAttest: (
  wuaRequest: WUARequest,
) => RTE.ReaderTaskEither<
  { androidAttestationValidationConfig: AndroidAttestationValidationConfig },
  Error | IntegrityCheckError,
  readonly AttestedKey[]
> = (wuaRequest) =>
  wuaRequest.platform === "android"
    ? validateAndroidKeysToAttest(wuaRequest.nonce, wuaRequest.keysToAttest)
    : validateIosKeysToAttest(wuaRequest.keysToAttest);

export const CreateWalletUnitAttestationHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req.body,
    requireWalletUnitAttestationRequest,
    RTE.fromTaskEither,
    RTE.chain(({ userId, wuaRequest }) =>
      isLoadTestUser(userId)
        ? RTE.right(testWalletUnitAttestation)
        : generateWalletUnitAttestation({ userId, wuaRequest }),
    ),
    RTE.map((walletUnitAttestation) => ({
      wallet_unit_attestation: walletUnitAttestation,
    })),
    RTE.map(H.successJson),
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createWalletUnitAttestation",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
