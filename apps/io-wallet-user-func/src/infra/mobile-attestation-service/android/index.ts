import { parse, ValidationError } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { getCrlFromUrls } from "@/certificates";

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

export const validateAndroidAttestation = (
  data: Buffer,
  nonce: NonEmptyString,
  bundleIdentifiers: string[],
  googlePublicKeys: string[],
  androidCrlUrls: string[],
  httpRequestTimeout: number,
): TE.TaskEither<Error | ValidationError, ValidatedAttestation> =>
  pipe(
    data.toString("utf-8"),
    S.split(","),
    RA.map(
      flow(base64ToPem, (cert) =>
        E.tryCatch(
          () => new X509Certificate(cert),
          () =>
            new AndroidAttestationError(`Unable to decode X509 certificate`),
        ),
      ),
    ),
    RA.sequence(E.Applicative),
    TE.fromEither,
    TE.chain((x509Chain) =>
      pipe(
        getCrlFromUrls(androidCrlUrls, httpRequestTimeout),
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
  googleAppCredentialsEncoded: string,
  androidPlayIntegrityUrl: string,
  allowDevelopmentEnvironment: boolean,
) =>
  pipe(
    E.tryCatch(
      () => Buffer.from(googleAppCredentialsEncoded, "base64").toString(),
      E.toError,
    ),
    E.chain(J.parse),
    E.mapLeft(
      () =>
        new AndroidAssertionError(
          "Unable to parse Google App Credentials string",
        ),
    ),
    E.chainW(parse(GoogleAppCredentials, "Invalid Google App Credentials")),
    TE.fromEither,
    TE.chain((googleAppCredentials) =>
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
    ),
    TE.chain((assertionValidationResult) =>
      assertionValidationResult.success
        ? TE.right(undefined)
        : TE.left(new AndroidAssertionError(assertionValidationResult.reason)),
    ),
  );
