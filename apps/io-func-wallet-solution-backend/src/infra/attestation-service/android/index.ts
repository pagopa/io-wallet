import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as S from "fp-ts/lib/string";
import * as J from "fp-ts/Json";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { JWK } from "jose";
import { ValidatedAttestation } from "../../attestation-service";
import { validate } from "../../../validation";
import { verifyAttestation } from "./attestation";
import { GoogleAppCredentials, verifyAssertion } from "./assertion";

export const base64ToPem = (b64cert: string) =>
  `-----BEGIN CERTIFICATE-----\n${b64cert}-----END CERTIFICATE-----`;

// TODO: [SIW-944] Add Android integrity check. This is a mock
export const validateAndroidAttestation = (
  data: Buffer,
  nonce: NonEmptyString,
  hardwareKeyTag: NonEmptyString,
  bundleIdentifier: string,
  googlePublicKey: string,
  androidCrlUrl: string
): TE.TaskEither<Error, ValidatedAttestation> =>
  pipe(
    data.toString("utf-8"),
    S.split(","),
    RA.map(
      flow(base64ToPem, (cert) =>
        E.tryCatch(
          () => new X509Certificate(cert),
          () => new Error(`Unable to decode X509 certificate`)
        )
      )
    ),
    RA.sequence(E.Applicative),
    TE.fromEither,
    TE.chain((x509Chain) =>
      TE.tryCatch(
        () =>
          verifyAttestation({
            x509Chain,
            googlePublicKey,
            challenge: nonce,
            bundleIdentifier,
            androidCrlUrl,
          }),
        E.toError
      )
    )
  );

export const validateAndroidAssertion = (
  integrityAssertion: NonEmptyString,
  hardwareSignature: NonEmptyString,
  clientData: string,
  hardwareKey: JWK,
  bundleIdentifier: string,
  androidPlayStoreCertificateHash: string,
  googleAppCredentialsEncoded: string,
  androidPlayIntegrityUrl: string,
  allowDevelopmentEnvironment: boolean
) =>
  pipe(
    E.tryCatch(
      () => Buffer.from(googleAppCredentialsEncoded, "base64").toString(),
      E.toError
    ),
    E.chain(J.parse),
    E.mapLeft(() => new Error("Unable to parse Google App Credentials string")),
    E.chainW(validate(GoogleAppCredentials, "Invalid Google App Credentials")),
    TE.fromEither,
    TE.chain((googleAppCredentials) =>
      TE.tryCatch(
        () =>
          verifyAssertion({
            integrityAssertion,
            hardwareSignature,
            clientData,
            hardwareKey,
            bundleIdentifier,
            androidPlayStoreCertificateHash,
            googleAppCredentials,
            androidPlayIntegrityUrl,
            allowDevelopmentEnvironment,
          }),
        E.toError
      )
    )
  );
