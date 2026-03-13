import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import {
  areJwksEqual,
  ECKey,
  ECKeyWithKid,
  JwkPublicKey,
  validateJwkKid,
} from "io-wallet-common/jwk";

import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  IntegrityCheckError,
  toKeysThumbprints,
} from "@/infra/mobile-attestation-service";
import { verifyAndroidAttestation } from "@/infra/mobile-attestation-service";
import { validateWalletUnitAssertionRequest } from "@/infra/mobile-attestation-service/assertion-request-validation";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { WalletInstanceEnvironment } from "@/wallet-instance";
import {
  AttestedKey,
  createWalletUnitAttestation,
  WalletUnitAttestationData,
  WalletUnitAttestationEnvironment,
} from "@/wallet-unit-attestation";

import {
  requireWalletUnitAttestationRequest,
  WUARequest,
} from "../wallet-unit-attestation-request";

const getWalletUnitAttestationData =
  ({
    attestedKeys,
    platform,
    walletSolutionId,
    walletSolutionVersion,
  }: {
    attestedKeys: readonly AttestedKey[];
    platform: WUARequest["platform"];
    walletSolutionId: NonEmptyString;
    walletSolutionVersion: NonEmptyString;
  }): RTE.ReaderTaskEither<
    WalletUnitAttestationEnvironment,
    Error,
    WalletUnitAttestationData
  > =>
  ({ certificateRepository, federationEntity: { basePath }, signer }) =>
    pipe(
      "EC",
      signer.getFirstPublicKeyByKty,
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.chain(({ kid }) =>
        pipe(
          certificateRepository.getCertificateChainByKid(kid),
          TE.chain(
            flow(
              O.match(
                () => TE.left(new Error("Certificate chain not found")),
                (chain) => TE.right({ kid, x5c: chain }),
              ),
            ),
          ),
        ),
      ),
      TE.map(({ kid, x5c }) => ({
        attestedKeys,
        kid,
        platform,
        walletProviderName: basePath.href,
        walletSolutionId,
        walletSolutionVersion,
        x5c,
      })),
    );

const testWalletUnitAttestation = "this_is_a_test_wallet_unit_attestation";

const verifyAttestedJwkMatchesCnf = ({
  attestedJwk,
  cnfJwk,
}: {
  attestedJwk: JwkPublicKey;
  cnfJwk: ECKeyWithKid;
}): E.Either<IntegrityCheckError, void> =>
  pipe(
    attestedJwk,
    ECKey.decode,
    E.mapLeft(() => new Error()),
    E.chain((attestedEs256Jwk) =>
      areJwksEqual(attestedEs256Jwk, cnfJwk)
        ? E.right(undefined)
        : E.left(new Error()),
    ),
    E.mapLeft(() => new IntegrityCheckError(["Invalid key attestation"])),
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
    validateAssertionRequestAndAttestKeys({ userId, wuaRequest }),
    RTE.map((attestedKeys) => ({
      attestedKeys,
      platform: wuaRequest.platform,
      walletSolutionId: wuaRequest.walletSolutionId,
      walletSolutionVersion: wuaRequest.walletSolutionVersion,
    })),
    RTE.chainW(getWalletUnitAttestationData),
    RTE.chainW(createWalletUnitAttestation),
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
    RTE.traverseArray(({ jwk, keyAttestation }) =>
      pipe(
        verifyAndroidAttestation(keyAttestation, nonce),
        RTE.chainFirstEitherKW(({ jwk: attestedJwk }) =>
          verifyAttestedJwkMatchesCnf({
            attestedJwk,
            cnfJwk: jwk,
          }),
        ),
        RTE.map(({ deviceDetails: { keymasterSecurityLevel }, jwk }) => ({
          jwk,
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

const validateRequestHardwareAssertion: (input: {
  userId: FiscalCode;
  wuaRequest: WUARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  void
> = ({ userId, wuaRequest }) =>
  pipe(
    wuaRequest.keysToAttest.map(({ jwk }) => jwk),
    toKeysThumbprints,
    RTE.fromTaskEither,
    RTE.chainW((attestedKeysThumbprints) =>
      validateWalletUnitAssertionRequest({
        assertion: {
          ...wuaRequest,
          attestedKeysThumbprints,
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

const validateAssertionRequestAndAttestKeys: (input: {
  userId: FiscalCode;
  wuaRequest: WUARequest;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      androidAttestationValidationConfig: AndroidAttestationValidationConfig;
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  readonly AttestedKey[]
> = ({ userId, wuaRequest }) =>
  pipe(
    validateRequestHardwareAssertion({ userId, wuaRequest }),
    RTE.chainW(() => validateKeysToAttest(wuaRequest)),
  );

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
