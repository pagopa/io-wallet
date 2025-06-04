/* eslint-disable perfectionist/sort-objects */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ValidationResult } from "@/attestation-service";
import { KeyObject, X509Certificate } from "crypto";
import * as RR from "fp-ts/ReadonlyRecord";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

/**
 * Verify that the root public certificate is trustworthy and that each certificate signs the next certificate in the chain.
 * @param x509Chain - The chain of {@link X509Certificate} certificates. The root certificate must be the last element of the array.
 * @param rootPublicKey - The public key of root certificate.
 * @param skipExpirationvalidation - Skip validation of certificates expiration, default is false.
 */
export const validateIssuance = (
  x509Chain: readonly X509Certificate[],
  rootPublicKey: KeyObject,
  skipExpirationvalidation = false,
): ValidationResult => {
  if (!skipExpirationvalidation) {
    // Check certificates expiration dates
    const now = new Date();
    const datesValid = x509Chain.every(
      (c) => new Date(c.validFrom) <= now && now <= new Date(c.validTo),
    );
    if (!datesValid) {
      return {
        reason: `Certificates expired: ${x509Chain}`,
        success: false,
      };
    }
  }

  // Check that each certificate, except for the last, is issued by the subsequent one.
  if (x509Chain.length >= 2) {
    x509Chain.forEach((cert, index) => {
      if (index < x509Chain.length - 1) {
        const parent = x509Chain[index + 1];
        if (!cert || !parent || !cert.verify(parent.publicKey)) {
          return {
            reason: `Certificates chain is invalid: ${x509Chain}`,
            success: false,
          };
        }
      }
    });
  }

  // Check the signature of root certificate with root public key
  const rootCert = x509Chain[x509Chain.length - 1]; // Last certificate in the chain is the root certificate
  if (!rootCert || !rootCert.verify(rootPublicKey)) {
    return {
      reason: `Root certificate is not signed by root public key provided: ${x509Chain}`,
      success: false,
    };
  }

  return { success: true };
};

/**
 * Simplified type definition for the Certificate Revocation List (CRL) object.
 */
export const CRL = t.type({
  entries: t.record(
    t.string,
    t.partial({
      reason: t.string,
      status: t.string,
    }),
  ),
});
export type CRL = t.TypeOf<typeof CRL>;

/**
 * Check each certificate's revocation status to ensure that none of the certificates have been revoked.
 * @param x509Chain - The chain of {@link X509Certificate} certificates.
 * @param crl - The certificates revocation list.
 * @param httpRequestTimeout - The timeout for CRL fetch request in ms.
 */
export const validateRevocation = async (
  x509Chain: readonly X509Certificate[],
  crl: CRL,
): Promise<ValidationResult> => {
  const revokedSerials = Object.keys(crl.entries).map((key) =>
    key.toLowerCase(),
  );

  const revokedCertificates = x509Chain.filter((cert) => {
    const currentSn = cert.serialNumber.toLowerCase();
    return revokedSerials.some((revokedSerial) =>
      currentSn.includes(revokedSerial),
    );
  });

  if (revokedCertificates.length > 0) {
    return {
      reason: `A certificate within the chain has been revoked: ${revokedCertificates.map((c) => c.serialNumber).join(", ")}`,
      success: false,
    };
  }
  return { success: true };
};

const getCrlFromUrl =
  (httpRequestTimeout = 4000) =>
  (crlUrl: string): TE.TaskEither<Error, CRL> =>
    pipe(
      TE.tryCatch(
        () =>
          fetch(crlUrl, {
            method: "GET",
            signal: AbortSignal.timeout(httpRequestTimeout),
          }),
        E.toError,
      ),
      TE.chain((response) => TE.tryCatch(() => response.json(), E.toError)),
      TE.chainEitherK((json) =>
        pipe(
          CRL.decode(json),
          E.mapLeft(() => new Error("CRL invalid format")),
        ),
      ),
    );

export const mergeCRL = (input: readonly CRL[]): CRL =>
  pipe(
    input,
    RA.reduce<CRL, CRL["entries"]>({}, (acc, curr) =>
      pipe(
        curr.entries,
        RR.toReadonlyArray,
        RA.reduce(acc, (merged, [key, value]) =>
          RR.upsertAt(key, value)(merged),
        ),
      ),
    ),
    (entries) => ({ entries }),
  );

export const getCrlFromUrls = (
  crlUrls: string[],
  httpRequestTimeout = 4000,
): TE.TaskEither<Error, CRL> =>
  pipe(
    {
      entries: {
        "41a055c6e51e312cbb081139f0831db4801796cf": {
          status: "REVOKED",
          reason: "KEY_COMPROMISE",
        },
        "6e5998d0c8e7a361c662166c8c5f8105": {
          status: "REVOKED",
          reason: "KEY_COMPROMISE",
        },
        "87829f49654c1fa220a027c31c90b037": {
          status: "REVOKED",
          reason: "KEY_COMPROMISE",
        },
      },
    },
    TE.of,
  );
