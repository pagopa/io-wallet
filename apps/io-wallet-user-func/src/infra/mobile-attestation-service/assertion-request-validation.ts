import { ValidationError } from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { JwkPublicKey } from "io-wallet-common/jwk";

import {
  AssertionValidationConfig,
  verifyAndroidAssertion,
  verifyIosAssertion,
} from "@/infra/mobile-attestation-service";
import { NonceEnvironment } from "@/nonce";
import { getPublicKeyFromCnf, verifyAndDecodeJwt } from "@/verifier";
import {
  getValidWalletInstanceByUserId,
  WalletInstanceEnvironment,
} from "@/wallet-instance";
import { consumeNonce } from "@/wallet-instance-request";

export const verifyJwtWithInternalKey = (jwt: string) =>
  pipe(
    jwt,
    getPublicKeyFromCnf,
    TE.fromEither,
    TE.chain(verifyAndDecodeJwt(jwt)),
  );

export interface AssertionWithHeaderAndCnfKid {
  header: {
    kid: NonEmptyString;
  };
  payload: {
    cnf: {
      jwk: {
        kid?: NonEmptyString;
      };
    };
  };
}

export interface AssertionWithIssuerAndHardwareKeyTag {
  hardwareKeyTag: NonEmptyString;
  iss: NonEmptyString;
}

export const validateIssuerMatchesHardwareKeyTag = <
  T extends AssertionWithIssuerAndHardwareKeyTag,
>(
  assertion: T,
): E.Either<ValidationError, T> =>
  assertion.iss === assertion.hardwareKeyTag
    ? E.right(assertion)
    : E.left(
        new ValidationError([
          "Invalid assertion: payload.iss must match payload.hardware_key_tag",
        ]),
      );

export const validateHeaderKidMatchesCnfKidIfPresent = <
  T extends AssertionWithHeaderAndCnfKid,
>(
  assertion: T,
): E.Either<ValidationError, T> =>
  assertion.payload.cnf.jwk.kid === undefined ||
  assertion.payload.cnf.jwk.kid === assertion.header.kid
    ? E.right(assertion)
    : E.left(
        new ValidationError([
          "Invalid assertion: header.kid must match payload.cnf.jwk.kid when present",
        ]),
      );

interface Assertion {
  cnf: {
    jwk: JwkPublicKey;
  };
  hardwareKeyTag: NonEmptyString;
  hardwareSignature: NonEmptyString;
  integrityAssertion: NonEmptyString;
  nonce: NonEmptyString;
  platform: "Android" | "iOS";
  walletSolutionId: NonEmptyString;
  walletSolutionVersion: NonEmptyString;
}

const validateAssertion: (
  assertion: Assertion,
  hardwareKey: JwkPublicKey,
  signCount: number,
  user: FiscalCode,
) => RTE.ReaderTaskEither<
  { assertionValidationConfig: AssertionValidationConfig },
  Error,
  void
> = (assertion, hardwareKey, signCount, user) =>
  assertion.platform === "iOS"
    ? verifyIosAssertion({
        hardwareKey,
        hardwareSignature: assertion.hardwareSignature,
        integrityAssertion: assertion.integrityAssertion,
        jwk: assertion.cnf.jwk,
        nonce: assertion.nonce,
        signCount,
      })
    : verifyAndroidAssertion({
        hardwareKey,
        hardwareSignature: assertion.hardwareSignature,
        integrityAssertion: assertion.integrityAssertion,
        jwk: assertion.cnf.jwk,
        nonce: assertion.nonce,
        user,
      });

/**
 * Validates the wallet attestation request by performing the following steps:
 * 1. Consumes the nonce from the request
 * 2. Retrieves the wallet instance associated with the attestation request and verifies it hasn't been revoked
 * 3. For non-test users, validates the assertion in the request
 */
export const validateAssertionRequest: (input: {
  assertion: Assertion;
  userId: FiscalCode;
}) => RTE.ReaderTaskEither<
  NonceEnvironment &
    WalletInstanceEnvironment & {
      assertionValidationConfig: AssertionValidationConfig;
    },
  Error,
  void
> = ({ assertion, userId }) =>
  pipe(
    assertion.nonce,
    consumeNonce,
    RTE.chainW(() =>
      getValidWalletInstanceByUserId(assertion.hardwareKeyTag, userId),
    ),
    RTE.chainW((walletInstance) =>
      validateAssertion(
        assertion,
        walletInstance.hardwareKey,
        walletInstance.signCount,
        userId,
      ),
    ),
  );
