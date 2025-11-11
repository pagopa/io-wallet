import { KeyObject, X509Certificate } from "crypto";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/Option";
import * as RR from "fp-ts/ReadonlyRecord";
import * as t from "io-ts";

import { ValidationResult } from "@/attestation-service";

const getRootPublicKey: (
  x509Chain: readonly X509Certificate[],
  googlePublicKeys: KeyObject[],
) => KeyObject | undefined = (x509Chain, googlePublicKeys) => {
  const rootCert = x509Chain[x509Chain.length - 1]; // Last certificate in the chain is the root certificate
  if (!rootCert) {
    return undefined;
  }
  for (const googlePublicKey of googlePublicKeys) {
    if (rootCert.verify(googlePublicKey)) {
      return googlePublicKey;
    }
  }

  return undefined;
};

/**
 * Verify that the root public certificate is trustworthy and that each certificate signs the next certificate in the chain.
 * @param x509Chain - The chain of {@link X509Certificate} certificates. The root certificate must be the last element of the array.
 * @param rootPublicKey - The public key of root certificate.
 * @param skipExpirationvalidation - Skip validation of certificates expiration, default is false.
 */
export const validateIssuance = (
  x509Chain: readonly X509Certificate[],
  rootPublicKeys: KeyObject[],
  skipExpirationvalidation = false,
): ValidationResult => {
  // Check the signature of root certificate with root public key
  const rootPublicKey = getRootPublicKey(x509Chain, rootPublicKeys);
  if (!rootPublicKey) {
    return {
      reason: `Root certificate not found or not signed by any provided root public key. x509chain: ${x509Chain}`,
      success: false,
    };
  }

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
export const validateRevocation = (
  x509Chain: readonly X509Certificate[],
  crl: CRL,
): ValidationResult => {
  const revokedSerials = Object.keys(crl.entries).map((key) =>
    key.toLowerCase(),
  );

  for (const cert of x509Chain) {
    const currentSn = cert.serialNumber.toLowerCase();
    if (
      revokedSerials.some((revokedSerial) => currentSn.includes(revokedSerial))
    ) {
      return {
        reason: `A certificate within the chain has been revoked: ${cert.serialNumber}`,
        success: false,
      };
    }
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
    crlUrls,
    RA.map(getCrlFromUrl(httpRequestTimeout)),
    RA.sequence(TE.ApplicativePar),
    TE.map(mergeCRL),
  );

// TODO: move to another file
export interface CertificateRepository {
  getCertificateChainByKid: (
    kid: string,
  ) => TE.TaskEither<Error, O.Option<string[]>>;
  insertCertificateChain: (input: {
    certificateChain: string[];
    kid: string;
  }) => TE.TaskEither<Error, void>;
}

export const insertCertificateChain: (input: {
  certificateChain: string[];
  kid: string;
}) => RTE.ReaderTaskEither<
  { certificateRepository: CertificateRepository },
  Error,
  void
> =
  (input) =>
  ({ certificateRepository }) =>
    certificateRepository.insertCertificateChain(input);

export const getCertificateChainByKid: (
  kid: string,
) => RTE.ReaderTaskEither<
  { certificateRepository: CertificateRepository },
  Error,
  O.Option<string[]>
> =
  (kid) =>
  ({ certificateRepository }) =>
    certificateRepository.getCertificateChainByKid(kid);
