import { JwkPublicKey } from "@/jwk";
import { validate } from "@/validation";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as J from "fp-ts/Json";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";

import { ValidatedAttestation } from "..";
import { GoogleAppCredentials, verifyAssertion } from "./assertion";
import { verifyAttestation } from "./attestation";

export const base64ToPem = (b64cert: string) =>
  `-----BEGIN CERTIFICATE-----\n${b64cert}-----END CERTIFICATE-----`;

// TODO: [SIW-944] Add Android integrity check. This is a mock
export const validateAndroidAttestation = (
  data: Buffer,
  nonce: NonEmptyString,
  hardwareKeyTag: NonEmptyString,
  bundleIdentifier: string,
  googlePublicKey: string,
  androidCrlUrl: string,
): TE.TaskEither<Error, ValidatedAttestation> =>
  pipe(
    data.toString("utf-8"),
    S.split(","),
    RA.map(
      flow(base64ToPem, (cert) =>
        E.tryCatch(
          () => new X509Certificate(cert),
          () =>
            new Error(
              `[Android Attestation] Unable to decode X509 certificate`,
            ),
        ),
      ),
    ),
    RA.sequence(E.Applicative),
    TE.fromEither,
    TE.chain((x509Chain) =>
      pipe(
        TE.tryCatch(
          () =>
            verifyAttestation({
              androidCrlUrl,
              bundleIdentifier,
              challenge: nonce,
              googlePublicKey,
              x509Chain,
            }),
          E.toError,
        ),
        TE.chainW(({ hardwareKey }) =>
          pipe(
            hardwareKey,
            validate(JwkPublicKey, "Invalid JWK Public Key"),
            E.map((hardwareKey) => ({ hardwareKey })),
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
  bundleIdentifier: string,
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
        new Error(
          "[Android Assertion] Unable to parse Google App Credentials string",
        ),
    ),
    E.chainW(validate(GoogleAppCredentials, "Invalid Google App Credentials")),
    TE.fromEither,
    TE.chain((googleAppCredentials) =>
      TE.tryCatch(
        () =>
          verifyAssertion({
            allowDevelopmentEnvironment,
            androidPlayIntegrityUrl,
            androidPlayStoreCertificateHash,
            bundleIdentifier,
            clientData,
            googleAppCredentials,
            hardwareKey,
            hardwareSignature,
            integrityAssertion,
          }),
        E.toError,
      ),
    ),
  );
