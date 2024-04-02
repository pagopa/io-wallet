import { KeyObject, X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { pipe } from "fp-ts/function";
import { decode } from "cbor-x";
import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { validate } from "../../validation";

// Apple static root certificate
const APPLE_APP_ATTESTATION_ROOT_CA = new X509Certificate(
  "-----BEGIN CERTIFICATE-----\nMIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYwJAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNaFw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlvbiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdhNbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9auYen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijVoyFraWVIyd/dganmrduC1bmTBGwD\n-----END CERTIFICATE-----"
);

const buffer = new t.Type<Buffer, Buffer, unknown>(
  "buffer",
  (input: unknown): input is Buffer => Buffer.isBuffer(input),
  (input, context) =>
    Buffer.isBuffer(input) ? t.success(input) : t.failure(input, context),
  t.identity
);

// iOS attestation type
export const iOsAttestation = t.type({
  fmt: t.literal("apple-appattest"),
  attStmt: t.type({
    x5c: t.array(buffer),
    receipt: buffer,
  }),
  authData: buffer,
});

export type iOsAttestation = t.TypeOf<typeof iOsAttestation>;

const findAndValidateCertificate =
  (issuer: string, publicKey: KeyObject) =>
  (certificates: ReadonlyArray<X509Certificate>) =>
    pipe(
      certificates,
      RA.findFirst((cert) => pipe(cert.issuer, S.includes(issuer))),
      E.fromOption(
        () => new Error(`Certificate not found with issuer ${issuer}`)
      ),
      E.chain((cert) =>
        cert.verify(publicKey)
          ? pipe(cert, E.of)
          : E.left(new Error(`Invalid signature of ${cert.subject}`))
      )
    );

/* https://developer.apple.com/documentation/devicecheck/validating_apps_that_connect_to_your_server
 * 1. Verify that the attestation statement’s x5c field contains two certificates, the first of which is the
 *    sub CA certificate and the second of which is the client certificate.
 */
const validateX509Certificates = (x5c: Buffer[]) =>
  pipe(
    x5c,
    RA.size,
    (size) =>
      // iOS app attest has only  2 certificates
      size === 2
        ? pipe(
            x5c,
            RA.map((cert) =>
              E.tryCatch(
                () => new X509Certificate(cert),
                () => new Error(`Unable to decode X509 certificate`)
              )
            ),
            RA.sequence(E.Applicative)
          )
        : E.left(new Error("Invalid number of certificates")),
    E.chain((x5c) =>
      pipe(
        x5c,
        findAndValidateCertificate(
          "Apple App Attestation Root CA",
          APPLE_APP_ATTESTATION_ROOT_CA.publicKey
        ),
        E.chain((intermediateCertificate) =>
          pipe(
            x5c,
            findAndValidateCertificate(
              "Apple App Attestation CA 1",
              intermediateCertificate.publicKey
            ),
            E.map((leafCertificate) => ({
              leafCertificate,
              intermediateCertificate,
            }))
          )
        )
      )
    )
  );

export const valiateiOSAttestation = (data: Buffer, nonce: NonEmptyString) =>
  pipe(
    E.tryCatch(
      () => decode(data),
      () => new Error(`Unable to decode data`)
    ),
    E.chainW(validate(iOsAttestation, "iOS attestation format is invalid")),
    E.chain((decodedAttestation) =>
      pipe(
        decodedAttestation.attStmt.x5c,
        validateX509Certificates,
        E.map((x5c) => ({
          ...decodedAttestation,
          attStmt: {
            ...decodedAttestation.attStmt,
            x5c,
          },
        }))
      )
    ),
    E.map((el) => {
      console.log(el);
      return el;
    }),
    E.map(() => true)
  );
