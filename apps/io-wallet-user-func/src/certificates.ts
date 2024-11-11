import { ValidationResult } from "@/attestation-service";
import { KeyObject, X509Certificate } from "crypto";

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
        reason: "Certificates expired",
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
            reason: "Certificates chain is invalid",
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
interface CRL {
  entries: Record<
    string,
    { comment: string; expires: string; reason: string; status: string }
  >;
}

/**
 * Check each certificate's revocation status to ensure that none of the certificates have been revoked.
 * @param x509Chain - The chain of {@link X509Certificate} certificates.
 * @param crlUrl - The URL of the revocation list.
 * @param httpRequestTimeout - The timeout for CRL fetch request in ms.
 */
export const validateRevocation = async (
  x509Chain: readonly X509Certificate[],
  crlUrl: string,
  httpRequestTimeout: number,
): Promise<ValidationResult> => {
  const crlResponse = await fetch(crlUrl, {
    method: "GET",
    signal: AbortSignal.timeout(httpRequestTimeout),
  });
  if (!crlResponse.ok) {
    throw new Error(`Failed to fetch CRL from ${crlUrl}`);
  }
  const crl = (await crlResponse.json()) as CRL;

  const revokedSerials = Object.keys(crl.entries).map((key) =>
    key.toLowerCase(),
  );

  const isRevoked = x509Chain.some((cert) => {
    const currentSn = cert.serialNumber.toLowerCase();
    return revokedSerials.some((revokedSerial) =>
      currentSn.includes(revokedSerial),
    );
  });

  if (isRevoked) {
    return {
      reason: `A certificate within the chain has been revoked: ${x509Chain}`,
      success: false,
    };
  }
  return { success: true };
};
