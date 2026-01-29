import { parse, ValidationError } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as S from "fp-ts/lib/string";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { getCrlFromUrl } from "@/certificates";

import { ValidatedAttestation } from "../../mobile-attestation-service";
import { AndroidAssertionError, AndroidAttestationError } from "../errors";
import { GoogleAppCredentials, verifyAssertion } from "./assertion";
import { verifyAttestation } from "./attestation";

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

export const validateAndroidAttestation = (
  x509Chain: readonly X509Certificate[],
  nonce: NonEmptyString,
  bundleIdentifiers: string[],
  googlePublicKeys: string[],
  androidCrlUrl: string,
  httpRequestTimeout: number,
): TE.TaskEither<Error | ValidationError, ValidatedAttestation> =>
  pipe(
    getCrlFromUrl(androidCrlUrl, httpRequestTimeout),
    TE.chain((attestationCrl) =>
      TE.tryCatch(
        () =>
          verifyAttestation({
            attestationCrl,
            bundleIdentifiers,
            challenge: nonce,
            googlePublicKeys,
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

export const validateAndroidAssertion = (
  integrityAssertion: NonEmptyString,
  hardwareSignature: NonEmptyString,
  clientData: string,
  hardwareKey: JwkPublicKey,
  bundleIdentifiers: string[],
  androidPlayStoreCertificateHash: string,
  googleAppCredentials: GoogleAppCredentials,
  androidPlayIntegrityUrl: string,
  allowDevelopmentEnvironment: boolean,
) =>
  pipe(
    TE.tryCatch(
      () =>
        verifyAssertion({
          allowDevelopmentEnvironment,
          androidPlayIntegrityUrl,
          androidPlayStoreCertificateHash,
          bundleIdentifiers,
          clientData,
          googleAppCredentials,
          hardwareKey,
          hardwareSignature,
          integrityAssertion,
        }),
      E.toError,
    ),
    TE.chain((assertionValidationResult) =>
      assertionValidationResult.success
        ? TE.right(undefined)
        : TE.left(new AndroidAssertionError(assertionValidationResult.reason)),
    ),
  );
