import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as A from "fp-ts/Array";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { areJwksEqual, ECKey } from "io-wallet-common/jwk";

import { Platform, PlatformFromRequest } from "@/infra/http/platform-codecs";
import { verifyJwtWithInternalKey } from "@/verifier";

const headerTyp = "wua-request+jwt";
const keyAttestationHeaderTyp = "key-attestation-request+jwt";

const WalletUnitAttestationRequestBody = t.type({
  assertion: NonEmptyString,
  fiscal_code: FiscalCode,
});

const AssertionJwtApi = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal(headerTyp),
  }),
  payload: t.type({
    cnf: t.type({
      jwk: ECKey,
    }),
    exp: t.number,
    hardware_key_tag: NonEmptyString,
    hardware_signature: NonEmptyString,
    iat: t.number,
    integrity_assertion: NonEmptyString,
    iss: NonEmptyString,
    keys_to_attest: t.array(NonEmptyString),
    nonce: NonEmptyString,
    platform: PlatformFromRequest,
    wallet_solution_id: t.literal("appio"),
    wallet_solution_version: NonEmptyString,
  }),
});

const AssertionJwtDecodedPayload = t.type({
  cnf: t.type({
    jwk: ECKey,
  }),
  hardwareKeyTag: NonEmptyString,
  hardwareSignature: NonEmptyString,
  integrityAssertion: NonEmptyString,
  iss: NonEmptyString,
  keysToAttest: t.array(NonEmptyString),
  nonce: NonEmptyString,
  platform: Platform,
  walletSolutionId: t.literal("appio"),
  walletSolutionVersion: NonEmptyString,
});

const AssertionJwtDecoded = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal(headerTyp),
  }),
  payload: t.intersection([
    AssertionJwtDecodedPayload,
    t.type({
      exp: t.number,
      iat: t.number,
    }),
  ]),
});

const AssertionJwt = new t.Type<
  t.TypeOf<typeof AssertionJwtDecoded>,
  t.TypeOf<typeof AssertionJwtApi>,
  unknown
>(
  "AssertionJwt",
  AssertionJwtDecoded.is,
  (input, context) =>
    pipe(
      AssertionJwtApi.validate(input, context),
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
          keysToAttest: payload.keys_to_attest,
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
      keys_to_attest: payload.keysToAttest,
      nonce: payload.nonce,
      platform: payload.platform,
      wallet_solution_id: payload.walletSolutionId,
      wallet_solution_version: payload.walletSolutionVersion,
    },
  }),
);

type AssertionJwt = t.TypeOf<typeof AssertionJwt>;

const KeyAttestationJwtApi = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal(keyAttestationHeaderTyp),
  }),
  payload: t.type({
    cnf: t.type({
      jwk: ECKey,
    }),
    exp: t.number,
    iat: t.number,
    wscd_key_attestation: t.type({
      attestation: t.union([NonEmptyString, t.undefined]),
      storage_type: t.literal("LOCAL_NATIVE"),
    }),
  }),
});

const KeyAttestationJwtDecoded = t.type({
  header: t.type({
    alg: t.literal("ES256"),
    kid: NonEmptyString,
    typ: t.literal(keyAttestationHeaderTyp),
  }),
  payload: t.type({
    cnf: t.type({
      jwk: ECKey,
    }),
    exp: t.number,
    iat: t.number,
    wscdKeyAttestation: t.type({
      attestation: t.union([NonEmptyString, t.undefined]),
      storageType: t.literal("LOCAL_NATIVE"),
    }),
  }),
});

const KeyAttestationJwt = new t.Type<
  t.TypeOf<typeof KeyAttestationJwtDecoded>,
  t.TypeOf<typeof KeyAttestationJwtApi>,
  unknown
>(
  "KeyAttestationJwt",
  KeyAttestationJwtDecoded.is,
  (input, context) =>
    pipe(
      KeyAttestationJwtApi.validate(input, context),
      E.map(({ header, payload }) => ({
        header,
        payload: {
          cnf: payload.cnf,
          exp: payload.exp,
          iat: payload.iat,
          wscdKeyAttestation: {
            attestation: payload.wscd_key_attestation.attestation,
            storageType: payload.wscd_key_attestation.storage_type,
          },
        },
      })),
    ),
  ({ header, payload }) => ({
    header,
    payload: {
      cnf: payload.cnf,
      exp: payload.exp,
      iat: payload.iat,
      wscd_key_attestation: {
        attestation: payload.wscdKeyAttestation.attestation,
        storage_type: payload.wscdKeyAttestation.storageType,
      },
    },
  }),
);

type KeyAttestationJwt = t.TypeOf<typeof KeyAttestationJwt>;

const AssertionJwtDecodedAndroid = t.type({
  ...AssertionJwtDecodedPayload.props,
  keysToAttest: t.array(
    t.type({
      jwk: ECKey,
      keyAttestation: NonEmptyString,
      kid: NonEmptyString,
    }),
  ),
  kid: NonEmptyString,
  platform: t.literal("android"),
});

const AssertionJwtDecodedPayloadIos = t.type({
  ...AssertionJwtDecodedPayload.props,
  keysToAttest: t.array(
    t.type({
      jwk: ECKey,
      kid: NonEmptyString,
    }),
  ),
  kid: NonEmptyString,
  platform: t.literal("ios"),
});

export type WUARequest =
  | Omit<AssertionJwtDecodedAndroid, "iss" | "kid">
  | Omit<AssertionJwtDecodedPayloadIos, "iss" | "kid">;

type AssertionJwtDecodedAndroid = t.TypeOf<typeof AssertionJwtDecodedAndroid>;

type AssertionJwtDecodedPayloadIos = t.TypeOf<
  typeof AssertionJwtDecodedPayloadIos
>;

type AssertionJwtWithDecodedKeys =
  | AssertionJwtDecodedAndroid
  | AssertionJwtDecodedPayloadIos;

const verifyAssertionJwtProperties = (
  input: AssertionJwtWithDecodedKeys,
): TE.TaskEither<Error, void> =>
  pipe(
    input,
    E.fromPredicate(
      (decodedAssertionJwt) =>
        decodedAssertionJwt.iss === decodedAssertionJwt.hardwareKeyTag &&
        decodedAssertionJwt.keysToAttest.length > 0,
      () => new Error(),
    ),
    TE.fromEither,
    TE.chain(() =>
      TE.tryCatch(
        () => areJwksEqual(input.cnf.jwk, input.keysToAttest[0].jwk),
        E.toError,
      ),
    ),
    TE.chain((areEqual) =>
      areEqual ? TE.right(undefined) : TE.left(new Error()),
    ),
  );

const verifyKeyAttestationJwtsProperties = (
  input: AssertionJwtWithDecodedKeys["keysToAttest"],
): E.Either<Error, void> =>
  pipe(
    input,
    E.fromPredicate(
      (keysToAttest) =>
        keysToAttest.every(
          (keyToAttest) =>
            keyToAttest.jwk.kid === undefined ||
            keyToAttest.jwk.kid === keyToAttest.kid,
        ),
      () => new Error(),
    ),
    E.map(() => undefined),
  );

const verifyAndDecodeKeyAttestationJwts = (
  jwts: string[],
): TE.TaskEither<Error, KeyAttestationJwt[]> =>
  pipe(
    jwts,
    A.traverse(TE.ApplicativePar)(
      flow(
        verifyJwtWithInternalKey,
        TE.chainEitherKW(H.parse(KeyAttestationJwt)),
      ),
    ),
  );

const toPlatformDecodedAssertionJwt = (
  input: Pick<AssertionJwt, "header"> & {
    payload: Omit<AssertionJwt["payload"], "keysToAttest"> & {
      keysToAttest: KeyAttestationJwt[];
    };
  },
): TE.TaskEither<Error, AssertionJwtWithDecodedKeys> =>
  input.payload.platform === "android"
    ? pipe(
        input.payload.keysToAttest,
        E.fromPredicate(
          (keysToAttest) =>
            keysToAttest.every(
              (keyToAttest) =>
                keyToAttest.payload.wscdKeyAttestation.attestation !==
                undefined,
            ),
          () => new Error(),
        ),
        E.map((keysToAttest) => ({
          cnf: input.payload.cnf,
          hardwareKeyTag: input.payload.hardwareKeyTag,
          hardwareSignature: input.payload.hardwareSignature,
          integrityAssertion: input.payload.integrityAssertion,
          iss: input.payload.iss,
          keysToAttest: keysToAttest.map((keyToAttest) => ({
            jwk: keyToAttest.payload.cnf.jwk,
            keyAttestation: keyToAttest.payload.wscdKeyAttestation.attestation,
            kid: keyToAttest.header.kid,
          })),
          kid: input.header.kid,
          nonce: input.payload.nonce,
          platform: "android",
          walletSolutionId: input.payload.walletSolutionId,
          walletSolutionVersion: input.payload.walletSolutionVersion,
        })),
        E.chainW(AssertionJwtDecodedAndroid.decode),
        E.mapLeft(() => new Error()),
        TE.fromEither,
      )
    : pipe(
        input.payload.keysToAttest,
        E.fromPredicate(
          (keysToAttest) =>
            keysToAttest.every(
              (keyToAttest) =>
                keyToAttest.payload.wscdKeyAttestation.attestation ===
                undefined,
            ),
          () => new Error(),
        ),
        E.map((keysToAttest) => ({
          cnf: input.payload.cnf,
          hardwareKeyTag: input.payload.hardwareKeyTag,
          hardwareSignature: input.payload.hardwareSignature,
          integrityAssertion: input.payload.integrityAssertion,
          iss: input.payload.iss,
          keysToAttest: keysToAttest.map((keyToAttest) => ({
            jwk: keyToAttest.payload.cnf.jwk,
            kid: keyToAttest.header.kid,
          })),
          kid: input.header.kid,
          nonce: input.payload.nonce,
          platform: "ios",
          walletSolutionId: input.payload.walletSolutionId,
          walletSolutionVersion: input.payload.walletSolutionVersion,
        })),
        E.chainW(AssertionJwtDecodedPayloadIos.decode),
        E.mapLeft(() => new Error()),
        TE.fromEither,
      );

const verifyAndDecodeAssertionJwt = (
  assertionJwt: string,
): TE.TaskEither<Error, AssertionJwtWithDecodedKeys> =>
  pipe(
    assertionJwt,
    verifyJwtWithInternalKey,
    TE.chainEitherKW(H.parse(AssertionJwt)),
    TE.chain((assertionJwtWithEncodedKeysToAttest) =>
      pipe(
        verifyAndDecodeKeyAttestationJwts(
          assertionJwtWithEncodedKeysToAttest.payload.keysToAttest,
        ),
        TE.map((keysToAttest) => ({
          ...assertionJwtWithEncodedKeysToAttest,
          payload: {
            ...assertionJwtWithEncodedKeysToAttest.payload,
            keysToAttest,
          },
        })),
      ),
    ),
    TE.chain(toPlatformDecodedAssertionJwt),
  );

const verifyAndDecodeWalletUnitAttestationRequest = (
  walletUnitAttestationRequest: string,
): TE.TaskEither<H.ValidationError, WUARequest> =>
  pipe(
    walletUnitAttestationRequest,
    verifyAndDecodeAssertionJwt,
    TE.chainFirstW(verifyAssertionJwtProperties),
    TE.chainFirstEitherKW(({ keysToAttest }) =>
      verifyKeyAttestationJwtsProperties(keysToAttest),
    ),
    TE.mapLeft((error) =>
      error instanceof H.ValidationError
        ? error
        : new H.ValidationError([
            error instanceof Error
              ? error.message
              : "Invalid Wallet Unit Attestation request",
          ]),
    ),
  );

export const requireWalletUnitAttestationRequest = flow(
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
