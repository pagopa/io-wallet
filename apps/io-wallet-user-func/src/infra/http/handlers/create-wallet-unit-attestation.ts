import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as A from "fp-ts/lib/Array";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as S from "fp-ts/lib/string";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { validateJwkKid } from "io-wallet-common/jwk";

import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  IntegrityCheckError,
  verifyAndroidAttestation,
} from "@/infra/mobile-attestation-service";
import {
  validateAssertionRequest,
  validateHeaderKidMatchesCnfKidIfPresent,
  validateIssuerMatchesHardwareKeyTag,
  verifyJwtWithInternalKey,
} from "@/infra/mobile-attestation-service/assertion-request-validation";
import { NonceEnvironment } from "@/nonce";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import { WalletInstanceEnvironment } from "@/wallet-instance";
import {
  createWalletUnitAttestation,
  WalletUnitAttestationData,
  WalletUnitAttestationEnvironment,
} from "@/wallet-unit-attestation";

const WalletUnitAttestationRequestBody = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

const ES256PublicJwk = t.intersection([
  t.type({
    crv: t.literal("P-256"),
    kty: t.literal("EC"),
    x: NonEmptyString,
    y: NonEmptyString,
  }),
  t.partial({
    kid: NonEmptyString,
  }),
]);

const AssertionJWT = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal("wua-request+jwt"),
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
    keys_to_attest: t.array(NonEmptyString),
    nonce: NonEmptyString,
    platform: t.union([t.literal("iOS"), t.literal("Android")]),
    wallet_solution_id: NonEmptyString,
    wallet_solution_version: NonEmptyString,
  }),
});

const KeyToAttestJWT = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal("key-attestation-request+jwt"),
  }),
  payload: t.type({
    cnf: t.type({
      jwk: ES256PublicJwk,
    }),
    exp: t.number,
    iat: t.number,
    wscd_key_attestation: t.type({
      attestation: t.union([NonEmptyString, t.undefined]),
      storage_type: t.literal("LOCAL_NATIVE"),
    }),
  }),
});

interface WUARequest {
  cnf: {
    jwk: t.TypeOf<typeof ES256PublicJwk>;
  };
  hardwareKeyTag: NonEmptyString;
  hardwareSignature: NonEmptyString;
  headerKid: NonEmptyString;
  integrityAssertion: NonEmptyString;
  iss: NonEmptyString;
  keysToAttest: NonEmptyString[];
  nonce: NonEmptyString;
  platform: "Android" | "iOS";
  walletSolutionId: NonEmptyString;
  walletSolutionVersion: NonEmptyString;
}

const verifyAndDecodeWalletUnitAttestationRequest = (
  walletUnitAttestationRequest: string,
): TE.TaskEither<Error, WUARequest> =>
  pipe(
    walletUnitAttestationRequest,
    verifyJwtWithInternalKey,
    TE.chainEitherKW(H.parse(AssertionJWT)),
    TE.chainEitherKW(validateHeaderKidMatchesCnfKidIfPresent),
    TE.map(({ header, payload }) => ({
      cnf: {
        jwk: payload.cnf.jwk,
      },
      hardwareKeyTag: payload.hardware_key_tag,
      hardwareSignature: payload.hardware_signature,
      headerKid: header.kid,
      integrityAssertion: payload.integrity_assertion,
      iss: payload.iss,
      keysToAttest: payload.keys_to_attest,
      nonce: payload.nonce,
      platform: payload.platform,
      walletSolutionId: payload.wallet_solution_id,
      walletSolutionVersion: payload.wallet_solution_version,
    })),
    TE.chainEitherKW(validateIssuerMatchesHardwareKeyTag),
  );

const requireWalletUnitAttestationRequest = flow(
  H.parse(WalletUnitAttestationRequestBody),
  E.map(({ assertion, fiscal_code }) => ({
    assertion,
    fiscalCode: fiscal_code,
  })),
  TE.fromEither,
  TE.chain(({ assertion, fiscalCode }) =>
    pipe(
      assertion,
      verifyAndDecodeWalletUnitAttestationRequest,
      TE.map((wuaRequest) => ({
        userId: fiscalCode,
        wuaRequest,
      })),
    ),
  ),
);

const verifyAndDecodeKeyToAttestJwt = (
  keyToAttestJwt: NonEmptyString,
): TE.TaskEither<
  Error,
  {
    headerKid: NonEmptyString;
    jwk: t.TypeOf<typeof ES256PublicJwk>;
    wscdKeyAttestation: {
      attestation: NonEmptyString | undefined;
      storageType: "LOCAL_NATIVE";
    };
  }
> =>
  pipe(
    keyToAttestJwt,
    verifyJwtWithInternalKey,
    TE.chainEitherKW(H.parse(KeyToAttestJWT)),
    TE.chainEitherKW(validateHeaderKidMatchesCnfKidIfPresent),
    TE.map(({ header, payload }) => ({
      headerKid: header.kid,
      jwk: payload.cnf.jwk,
      wscdKeyAttestation: {
        attestation: payload.wscd_key_attestation.attestation,
        storageType: payload.wscd_key_attestation.storage_type,
      },
    })),
  );

const areSameJwk = (
  a: t.TypeOf<typeof ES256PublicJwk>,
  b: t.TypeOf<typeof ES256PublicJwk>,
): boolean =>
  a.kty === b.kty &&
  a.crv === b.crv &&
  a.x === b.x &&
  a.y === b.y &&
  a.kid === b.kid;

const validateFirstAttestedKeyConsistency = (
  wuaRequest: WUARequest,
): TE.TaskEither<Error, void> =>
  pipe(
    wuaRequest.keysToAttest,
    A.head,
    E.fromOption(
      () => new H.ValidationError(["keys_to_attest must be non-empty"]),
    ),
    TE.fromEither,
    TE.chainW(verifyAndDecodeKeyToAttestJwt),
    TE.chainEitherKW((firstKeyToAttest) =>
      wuaRequest.headerKid === firstKeyToAttest.headerKid
        ? E.right(firstKeyToAttest)
        : E.left(
            new H.ValidationError([
              "Invalid assertion: header.kid must match first keys_to_attest header.kid",
            ]),
          ),
    ),
    TE.chainEitherKW((firstKeyToAttest) =>
      areSameJwk(wuaRequest.cnf.jwk, firstKeyToAttest.jwk)
        ? E.right(undefined)
        : E.left(
            new H.ValidationError([
              "Invalid assertion: payload.cnf.jwk must match first keys_to_attest cnf.jwk",
            ]),
          ),
    ),
  );

interface AttestedKeyData {
  jwk: t.TypeOf<typeof ES256PublicJwk>;
  keymasterSecurityLevel?: number;
  storageType: "LOCAL_NATIVE";
}

const validateKeyToAttest: (
  keyToAttest: NonEmptyString,
  platform: "Android" | "iOS",
) => RTE.ReaderTaskEither<
  AndroidAttestationValidationConfig,
  Error | IntegrityCheckError,
  AttestedKeyData
> = (keyToAttest, platform) => (config) =>
  pipe(
    keyToAttest,
    verifyAndDecodeKeyToAttestJwt,
    TE.chain((decoded) =>
      platform === "Android"
        ? pipe(
            decoded.wscdKeyAttestation.attestation,
            E.fromNullable(
              new H.ValidationError([
                "wscd_key_attestation.attestation is required for Android LOCAL_NATIVE keys",
              ]),
            ),
            TE.fromEither,
            TE.chainW((attestation) =>
              pipe(
                config,
                verifyAndroidAttestation(attestation),
                TE.map((androidDeviceDetails) => ({
                  jwk: decoded.jwk,
                  keymasterSecurityLevel:
                    androidDeviceDetails.keymasterSecurityLevel,
                  storageType: decoded.wscdKeyAttestation.storageType,
                })),
              ),
            ),
          )
        : TE.right({
            jwk: decoded.jwk,
            storageType: decoded.wscdKeyAttestation.storageType,
          }),
    ),
  );

const validateKeysToAttest: (
  keysToAttest: NonEmptyString[],
  platform: "Android" | "iOS",
) => RTE.ReaderTaskEither<
  AndroidAttestationValidationConfig,
  Error | IntegrityCheckError,
  AttestedKeyData[]
> = (keysToAttest, platform) =>
  pipe(
    keysToAttest,
    RTE.traverseArray((keyToAttest) =>
      validateKeyToAttest(keyToAttest, platform),
    ),
    RTE.map((readonlyKeys) => [...readonlyKeys]),
  );

interface VerifiedAttestationData {
  attestedKeys: AttestedKeyData[];
  platform: "Android" | "iOS";
  walletSolutionId: NonEmptyString;
  walletSolutionVersion: NonEmptyString;
}

const getStorageStrengthFromAttestedKey = (
  platform: "Android" | "iOS",
  key: AttestedKeyData,
): string =>
  platform === "iOS"
    ? "iso_18045_moderate"
    : key.keymasterSecurityLevel === 2
      ? "iso_18045_moderate"
      : "iso_18045_enhanced-basic";

const deriveKeyStorage = (
  verifiedAttestationData: VerifiedAttestationData,
): string[] =>
  pipe(
    verifiedAttestationData.attestedKeys,
    A.map((attestedKey) =>
      getStorageStrengthFromAttestedKey(
        verifiedAttestationData.platform,
        attestedKey,
      ),
    ),
    A.uniq(S.Eq),
  );

const buildWalletUnitAttestationPayload = (
  verifiedAttestationData: VerifiedAttestationData,
  issuer: string,
  kid: string,
): Omit<WalletUnitAttestationData, "x5c"> =>
  pipe(deriveKeyStorage(verifiedAttestationData), (keyStorage) => ({
    attestedKeys: pipe(
      verifiedAttestationData.attestedKeys,
      A.map((attestedKey) => attestedKey.jwk),
    ),
    iss: issuer,
    keysExportable: false,
    keyStorage,
    kid,
    storageType: "LOCAL_NATIVE",
    userAuthentication: ["iso_18045_moderate"],
    walletProviderName: issuer,
    walletSolutionCertificationInformation: undefined,
    walletSolutionId: verifiedAttestationData.walletSolutionId,
    walletSolutionVersion: verifiedAttestationData.walletSolutionVersion,
  }));

const getCertificateChainOrFail = (
  certificateRepository: WalletUnitAttestationEnvironment["certificateRepository"],
  kid: string,
): TE.TaskEither<Error, string[]> =>
  pipe(
    certificateRepository.getCertificateChainByKid(kid),
    TE.chainEitherKW(
      flow(E.fromOption(() => new Error("Certificate chain not found"))),
    ),
  );

const getWalletUnitAttestationData =
  (
    verifiedAttestationData: VerifiedAttestationData,
  ): RTE.ReaderTaskEither<
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
      TE.map(({ kid }) => ({
        kid,
        payload: buildWalletUnitAttestationPayload(
          verifiedAttestationData,
          basePath.href,
          kid,
        ),
      })),
      TE.chainW(({ kid, payload }) =>
        pipe(
          getCertificateChainOrFail(certificateRepository, kid),
          TE.map((x5c) => ({ ...payload, x5c })),
        ),
      ),
    );

const testWalletUnitAttestation = {
  wallet_unit_attestation: "this_is_a_test_wallet_unit_attestation",
};

const generateWalletUnitAttestation: (request: {
  userId: FiscalCode;
  wuaRequest: WUARequest;
}) => RTE.ReaderTaskEither<
  AndroidAttestationValidationConfig &
    AssertionValidationConfig &
    NonceEnvironment &
    WalletInstanceEnvironment &
    WalletUnitAttestationEnvironment,
  Error,
  {
    wallet_unit_attestation: string;
  }
> = (request) =>
  pipe(
    request,
    verifyAssertionAndAttestKeys,
    RTE.map((attestedKeys) => ({
      attestedKeys,
      platform: request.wuaRequest.platform,
      walletSolutionId: request.wuaRequest.walletSolutionId,
      walletSolutionVersion: request.wuaRequest.walletSolutionVersion,
    })),
    RTE.chainW(getWalletUnitAttestationData),
    RTE.chainW(createWalletUnitAttestation),
    RTE.map((walletUnitAttestation) => ({
      wallet_unit_attestation: walletUnitAttestation,
    })),
  );

const verifyAssertionAndAttestKeys: (input: {
  userId: FiscalCode;
  wuaRequest: WUARequest;
}) => RTE.ReaderTaskEither<
  AndroidAttestationValidationConfig &
    AssertionValidationConfig &
    NonceEnvironment &
    WalletInstanceEnvironment,
  Error,
  AttestedKeyData[]
> = ({ userId, wuaRequest }) =>
  pipe(
    wuaRequest,
    validateFirstAttestedKeyConsistency,
    RTE.fromTaskEither,
    RTE.chainW(() =>
      validateAssertionRequest({
        assertion: wuaRequest,
        userId,
      }),
    ),
    RTE.chainW(() =>
      validateKeysToAttest(wuaRequest.keysToAttest, wuaRequest.platform),
    ),
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
