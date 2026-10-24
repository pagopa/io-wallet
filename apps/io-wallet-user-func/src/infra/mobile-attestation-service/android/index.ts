import { parse, ValidationError } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createHash, X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as S from "fp-ts/lib/string";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import {
  AndroidDeviceDetails,
  DeviceDetails,
} from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { getCrlFromUrl } from "@/certificates";
import { ValidatedAttestation } from "@/infra/mobile-attestation-service";

import { AndroidAssertionError, AndroidAttestationError } from "../errors";
import {
  ExternalServiceError,
  GoogleAppCredentials,
  validateAssertionSignature,
  verifyAssertion,
} from "./assertion";
import { AttestKeyRequirement, verifyAttestation } from "./attestation";

export const base64ToPem = (b64cert: string) =>
  `-----BEGIN CERTIFICATE-----\n${b64cert}-----END CERTIFICATE-----`;

const DeviceDetailsWithKey = t.type({
  deviceDetails: AndroidDeviceDetails,
  hardwareKey: JwkPublicKey,
});

export const parseAndroidAttestation = (data: Buffer) =>
  pipe(
    data.toString("utf-8"),
    S.split(","),
    RA.map((b64) =>
      E.tryCatch(
        () => new X509Certificate(base64ToPem(b64)),
        () => new AndroidAttestationError("Unable to decode X509 certificate"),
      ),
    ),
    RA.sequence(E.Applicative),
  );

export const validateAndroidAttestation = ({
  androidCrlUrl,
  attestKey,
  bundleIdentifiers,
  googlePublicKeys,
  httpRequestTimeout,
  nonce,
  signatureDigests,
  trustedSelfSignedBootKeys,
  x509Chain,
}: {
  androidCrlUrl: string;
  attestKey?: AttestKeyRequirement;
  bundleIdentifiers: string[];
  googlePublicKeys: string[];
  httpRequestTimeout: number;
  nonce: NonEmptyString;
  signatureDigests?: string[];
  trustedSelfSignedBootKeys?: ReadonlySet<string>;
  x509Chain: readonly X509Certificate[];
}): TE.TaskEither<Error | ValidationError, ValidatedAttestation> =>
  pipe(
    getCrlFromUrl(androidCrlUrl, httpRequestTimeout),
    TE.chain((attestationCrl) =>
      TE.tryCatch(
        () =>
          verifyAttestation({
            attestationCrl,
            attestKey,
            bundleIdentifiers,
            challenge: nonce,
            googlePublicKeys,
            signatureDigests,
            trustedSelfSignedBootKeys,
            x509Chain,
          }),
        E.toError,
      ),
    ),
    TE.chain((attestationValidationResult) =>
      attestationValidationResult.success
        ? TE.right(attestationValidationResult)
        : TE.left(
            new AndroidAttestationError(attestationValidationResult.reason),
          ),
    ),
    TE.chainW(flow(parse(DeviceDetailsWithKey), TE.fromEither)),
  );

export const parseGoogleAppCredentials = (
  googleAppCredentialsEncoded: string,
) =>
  pipe(
    E.tryCatch(
      () => Buffer.from(googleAppCredentialsEncoded, "base64").toString(),
      E.toError,
    ),
    E.chain(J.parse),
    E.chainW(parse(GoogleAppCredentials)),
    E.mapLeft(
      () =>
        new AndroidAssertionError(
          "Unable to parse Google App Credentials string",
        ),
    ),
  );

export interface AndroidAssertionParams {
  allowDevelopmentEnvironment: boolean;
  androidPlayIntegrityUrl: string;
  androidPlayStoreCertificateHash: string;
  bundleIdentifiers: string[];
  clientData: string;
  /** The device details stored at the wallet instance registration. */
  deviceDetails?: DeviceDetails;
  googleAppCredentials: GoogleAppCredentials;
  hardwareKey: JwkPublicKey;
  /** The fresh key attestation generated with the SHA-256 hex digest of the client data as challenge. */
  hardwareKeyAttestation?: NonEmptyString;
  hardwareSignature: NonEmptyString;
  integrityAssertion?: NonEmptyString;
  keyAttestationConfig: AndroidKeyAttestationConfig;
}

/**
 * Configuration to verify the fresh key attestation sent along with an integrity assertion.
 */
export interface AndroidKeyAttestationConfig {
  androidCrlUrl: string;
  googlePublicKeys: string[];
  httpRequestTimeout: number;
  signatureDigests: string[];
  trustedSelfSignedBootKeys: ReadonlySet<string>;
}

const validatePlayIntegrityAssertion = ({
  integrityAssertion,
  ...params
}: AndroidAssertionParams): TE.TaskEither<Error, void> =>
  integrityAssertion
    ? pipe(
        TE.tryCatch(
          () => verifyAssertion({ ...params, integrityAssertion }),
          E.toError,
        ),
        TE.chain((assertionValidationResult) =>
          assertionValidationResult.success
            ? TE.right(undefined)
            : TE.left(
                new AndroidAssertionError(assertionValidationResult.reason),
              ),
        ),
      )
    : TE.left(new AndroidAssertionError("Play Integrity token not provided"));

/**
 * Validates the fresh key attestation sent along with the assertion:
 * - the client data must be signed by the registered hardware key;
 * - the attestation must satisfy the same policy of the registration, with the SHA-256 hex digest
 *   of the client data as challenge;
 * - it must have been signed by the attest key pinned at registration, if any, which proves it comes from
 *   the registered device (a self-signed OS always requires it);
 * - the verified boot state and key must match the ones of the registration.
 * @param params - The assertion parameters
 * @returns A TaskEither which is right when the key attestation is valid
 */
const validateKeyAttestationAssertion = (
  hardwareKeyAttestation: NonEmptyString,
  params: AndroidAssertionParams,
): TE.TaskEither<Error, void> => {
  const registered =
    params.deviceDetails?.platform === "android"
      ? params.deviceDetails
      : undefined;
  return pipe(
    TE.tryCatch(
      () =>
        validateAssertionSignature(
          params.hardwareKey,
          params.clientData,
          params.hardwareSignature,
        ),
      E.toError,
    ),
    TE.filterOrElse(
      (isSignatureValid) => isSignatureValid,
      () => new AndroidAssertionError("Invalid hardware signature"),
    ),
    TE.chainEitherKW(() =>
      pipe(
        hardwareKeyAttestation,
        (value) => E.tryCatch(() => Buffer.from(value, "base64"), E.toError),
        E.chainW(parseAndroidAttestation),
      ),
    ),
    TE.chainW((x509Chain) =>
      validateAndroidAttestation({
        ...params.keyAttestationConfig,
        attestKey: {
          pinned: registered?.attestKey,
          requiredForSelfSigned: true,
        },
        bundleIdentifiers: params.bundleIdentifiers,
        nonce: createHash("sha256")
          .update(params.clientData)
          .digest("hex") as NonEmptyString,
        x509Chain,
      }),
    ),
    TE.chainW(({ deviceDetails }) =>
      deviceDetails.platform === "android" &&
      registered !== undefined &&
      deviceDetails.verifiedBootState === registered.verifiedBootState &&
      (registered.verifiedBootKey === undefined ||
        deviceDetails.verifiedBootKey === registered.verifiedBootKey)
        ? TE.right(undefined)
        : TE.left(
            new AndroidAssertionError(
              "Device state differs from the registration",
            ),
          ),
    ),
    TE.mapLeft((error) =>
      error instanceof ValidationError
        ? new AndroidAssertionError(error.violations.join(", "))
        : error,
    ),
  );
};

/**
 * Validates an Android integrity assertion. The Play Integrity token is verified first and, as fallback
 * when it is not provided or not valid, the fresh key attestation sent along with it, following the
 * GrapheneOS attestation compatibility guide: this allows devices running GrapheneOS with a locked
 * bootloader, for which the Play Integrity verdict is not available.
 * https://grapheneos.org/articles/attestation-compatibility-guide
 * @param params - The assertion parameters
 * @returns A TaskEither which is right when the assertion is valid
 */
export const validateAndroidAssertion = (
  params: AndroidAssertionParams,
): TE.TaskEither<Error, void> =>
  pipe(
    validatePlayIntegrityAssertion(params),
    TE.orElse((playIntegrityError) =>
      params.hardwareKeyAttestation
        ? pipe(
            validateKeyAttestationAssertion(
              params.hardwareKeyAttestation,
              params,
            ),
            TE.mapLeft((keyAttestationError) =>
              // Keep the external service error so that the request can be retried
              playIntegrityError instanceof ExternalServiceError
                ? playIntegrityError
                : new AndroidAssertionError(
                    `${playIntegrityError.message} | Key attestation: ${keyAttestationError.message}`,
                  ),
            ),
          )
        : TE.left(playIntegrityError),
    ),
  );
