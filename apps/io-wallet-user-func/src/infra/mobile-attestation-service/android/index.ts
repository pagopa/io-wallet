import { getCrlFromUrls } from "@/certificates";
import { parse } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { ValidatedAttestation } from "../../mobile-attestation-service";
import {
  AndroidAssertionError,
  AndroidAttestationError,
  UnknownAppOriginIntegrityCheckError,
} from "../errors";
import { GoogleAppCredentials, verifyAssertion } from "./assertion";
import { verifyAttestation } from "./attestation";

export const base64ToPem = (b64cert: string) =>
  `-----BEGIN CERTIFICATE-----\n${b64cert}-----END CERTIFICATE-----`;

// TODO: [SIW-944] Add Android integrity check. This is a mock
export const validateAndroidAttestation = (
  data: Buffer,
  nonce: NonEmptyString,
  hardwareKeyTag: NonEmptyString,
  bundleIdentifiers: string[],
  googlePublicKey: string,
  androidCrlUrls: string[],
  httpRequestTimeout: number,
): TE.TaskEither<Error, ValidatedAttestation> =>
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
                googlePublicKey,
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
        TE.chainW(({ deviceDetails, hardwareKey }) =>
          pipe(
            hardwareKey,
            parse(JwkPublicKey, "Invalid JWK Public Key"),
            E.map((hardwareKey) => ({ deviceDetails, hardwareKey })),
            TE.fromEither,
          ),
        ),
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
    TE.chain((assertionValidationResult) => {
      if (assertionValidationResult.success) {
        return TE.right(undefined);
      } else if (
        assertionValidationResult.reason ===
        `The app does not match the versions distributed by Google Play.`
      ) {
        return TE.left(new UnknownAppOriginIntegrityCheckError());
      } else {
        return TE.left(
          new AndroidAssertionError(assertionValidationResult.reason),
        );
      }
    }),
  );
