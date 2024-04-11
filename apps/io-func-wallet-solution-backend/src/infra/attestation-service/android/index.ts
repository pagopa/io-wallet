import { X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as S from "fp-ts/lib/string";
import { flow, pipe } from "fp-ts/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { JWK } from "jose";
import { ValidatedAttestation } from "../../attestation-service";
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
  _data: Buffer,
  _payload: NonEmptyString,
  _bundleIdentifier: string,
  _teamIdentifier: string,
  _hardwareKey: JWK,
  _signCount: number
) => pipe(TE.left(new Error("Not implemented yet")));
