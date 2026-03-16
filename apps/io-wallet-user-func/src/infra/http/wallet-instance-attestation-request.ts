import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { ECKey } from "io-wallet-common/jwk";

import { Platform, PlatformFromRequest } from "@/infra/http/platform-codecs";
import { verifyJwtWithInternalKey } from "@/verifier";

const headerTyp = "wia-request+jwt";

const WalletInstanceAttestationRequestBody = t.type({
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
    nonce: NonEmptyString,
    platform: PlatformFromRequest,
    wallet_solution_id: t.literal("appio"),
    wallet_solution_version: NonEmptyString,
  }),
});

const AssertionJwtDecoded = t.type({
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
    hardwareKeyTag: NonEmptyString,
    hardwareSignature: NonEmptyString,
    iat: t.number,
    integrityAssertion: NonEmptyString,
    iss: NonEmptyString,
    nonce: NonEmptyString,
    platform: Platform,
    walletSolutionId: t.literal("appio"),
    walletSolutionVersion: NonEmptyString,
  }),
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

export type WIARequest = Omit<
  t.TypeOf<typeof AssertionJwtDecoded>["payload"],
  "exp" | "iat" | "iss"
>;

const verifyAndDecodeWalletInstanceAttestationRequest = (
  walletInstanceAttestationRequest: string,
): TE.TaskEither<H.ValidationError, WIARequest> =>
  pipe(
    walletInstanceAttestationRequest,
    verifyJwtWithInternalKey,
    TE.chainEitherKW(H.parse(AssertionJwt)),
    TE.chainFirstEitherKW(({ payload }) =>
      pipe(
        payload.iss === payload.hardwareKeyTag
          ? E.right(undefined)
          : E.left(
              new Error(
                "Invalid jwt: payload.iss must match payload.hardware_key_tag",
              ),
            ),
      ),
    ),
    TE.map(({ payload }) => payload),
    TE.mapLeft((error) =>
      error instanceof H.ValidationError
        ? error
        : new H.ValidationError([
            error instanceof Error
              ? error.message
              : "Unexpected validation error",
          ]),
    ),
  );

export const requireWalletInstanceAttestationRequest = flow(
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
