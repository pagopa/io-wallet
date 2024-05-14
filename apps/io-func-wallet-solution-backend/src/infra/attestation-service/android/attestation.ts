import { X509Certificate, createPublicKey } from "crypto";
import { AsnConvert } from "@peculiar/asn1-schema";
import * as jose from "jose";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import {
  AttestationApplicationId,
  NonStandardKeyDescription,
} from "@peculiar/asn1-android";

/**
 * Simplified type definition for the Certificate Revocation List (CRL) object.
 */
type CRL = {
  entries: Record<
    string,
    { status: string; expires: string; reason: string; comment: string }
  >;
};

/**
 * Key attestation extension data schema OID
 * https://developer.android.com/privacy-and-security/security-key-attestation#key_attestation_ext_schema
 */
const KEY_OID = "1.3.6.1.4.1.11129.2.1.17";

export type VerifyAttestationParams = {
  x509Chain: ReadonlyArray<X509Certificate>;
  googlePublicKey: string;
  androidCrlUrl: string;
  challenge: string;
  bundleIdentifier: string;
};

export const verifyAttestation = async (params: VerifyAttestationParams) => {
  const { x509Chain, googlePublicKey, androidCrlUrl } = params;

  if (x509Chain.length <= 0) {
    throw new Error("[Android Attestation] No certificates provided");
  }

  validateIssuance(x509Chain, googlePublicKey);
  await validateRevocation(x509Chain, androidCrlUrl);
  const certWithExtension = validateKeyAttestationExtension(x509Chain);

  validateExtension(certWithExtension, params);

  const hardwareKey = await jose.exportJWK(certWithExtension.publicKey);

  return {
    hardwareKey,
  };
};

/**
 * 3.
 * Obtain a reference to the X.509 certificate chain parsing and validation library that is most appropriate for your toolset.
 * Verify that the root public certificate is trustworthy and that each certificate signs the next certificate in the chain.
 * @param x509Chain - The chain of {@link X509Certificate} certificates.
 * @throws {Error} - If the chain is invalid.
 */
export const validateIssuance = (
  x509Chain: ReadonlyArray<X509Certificate>,
  googlePublicKey: string
) => {
  // Check dates
  const now = new Date();
  const datesValid = x509Chain.every(
    (c) => new Date(c.validFrom) < now && now < new Date(c.validTo)
  );
  if (!datesValid) {
    throw new Error("[Android Attestation] Certificates expired");
  }

  // Check that each certificate, except for the last, is issued by the subsequent one.
  if (x509Chain.length >= 2) {
    x509Chain.forEach((subject, index) => {
      if (index < x509Chain.length - 1) {
        const issuer = x509Chain[index + 1];
        if (
          !subject ||
          !issuer ||
          subject.checkIssued(issuer) === false ||
          subject.verify(issuer.publicKey) === false
        ) {
          throw new Error("[Android Attestation] Certificate chain is invalid");
        }
      }
    });
  }

  const publicKey = createPublicKey(googlePublicKey);
  const rootCert = x509Chain[x509Chain.length - 1]; // Last certificate in the chain is the root certificate
  if (!rootCert || !rootCert.verify(publicKey)) {
    throw new Error(
      "[Android Attestation] Root certificate is not signed by Google Hardware Attestation Root CA"
    );
  }
};

/**
 * 4.
 * Check each certificate's revocation status to ensure that none of the certificates have been revoked.
 * @param x509Chain - The chain of {@link X509Certificate} certificates.
 * @throws {Error} - If any certificate in the chain is revoked.
 */
export const validateRevocation = async (
  x509Chain: ReadonlyArray<X509Certificate>,
  androidCrlUrl: string
) => {
  const res = await fetch(androidCrlUrl, { method: "GET" });
  if (!res.ok) {
    throw new Error("[Android Attestation] Failed to fetch CRL");
  }
  const crl = (await res.json()) as CRL; // Add type assertion for crl
  const isRevoked = x509Chain.some((cert) => cert.serialNumber in crl.entries);
  if (isRevoked) {
    throw new Error("[Android Attestation] Certificate is revoked");
  }
  return x509Chain;
};

/**
 * 6.
 * Obtain a reference to the ASN.1 parser library that is most appropriate for your toolset.
 * Find the nearest certificate to the root that contains the key attestation certificate extension.
 *  If the provisioning information certificate extension was present, the key attestation certificate extension must be in the immediately subsequent certificate.
 *  Use the parser to extract the key attestation certificate extension data from that certificate.
 * @param x509Chain - The chain of {@link X509Certificate} certificates.
 * @throws {Error} - If no key attestation extension is found.
 */
const validateKeyAttestationExtension = (
  x509Chain: ReadonlyArray<X509Certificate>
) => {
  /**
   * Parse the attestation record that is closest to the root. This prevents an adversary from
   * attesting an attestation record of their choice with an otherwise trusted chain using the
   * following attack:
   * 1) having the TEE attest a key under the adversary's control,
   * 2) using that key to sign a new leaf certificate with an attestation extension that has their chosen attestation record, then
   * 3) appending that certificate to the original certificate chain.
   */
  const certWithExtension = x509Chain.findLast((certificate) => {
    const ext = extractExtension(certificate, KEY_OID);
    return ext ?? false;
  });

  if (certWithExtension) {
    return certWithExtension;
  }

  throw new Error("[Android Attestation] No key attestation extension found");
};

const extractExtension = (certificate: X509Certificate, oid: string) => {
  const asn1 = asn1js.fromBER(certificate.raw);
  const parsedCertificate = new pkijs.Certificate({ schema: asn1.result });
  return parsedCertificate.extensions?.find((e) => e.extnID === oid);
};

/**
 * 7.
 * Check the extension data that you've retrieved in the previous steps for consistency and compare with the set of
 * values that you expect the hardware-backed key to contain.
 * @param extension - The 1.3.6.1.4.1.11129.2.1.17 {@link pkijs.Extension} extension.
 * @param attestationParams - The verify attestation {@link VerifyAttestationParams} params.
 * @throws {Error} - If the validation fail.
 */
const validateExtension = (
  certWithExtension: X509Certificate,
  attestationParams: VerifyAttestationParams
) => {
  const { challenge, bundleIdentifier } = attestationParams;

  const extension = extractExtension(certWithExtension, KEY_OID);
  if (!extension) {
    throw new Error(
      "[Android Attestation] Unable to extract extension from certificate"
    );
  }

  const extensionBerEncoded = extension.extnValue.getValue();

  const keyDescription = AsnConvert.parse(
    extensionBerEncoded,
    NonStandardKeyDescription
  );

  /*
   * Check security level of attestation and key master.
   * 0: Software
   * 1: TrustedEnvironment
   * 2: StrongBox
   *
   * Warning: Although it is possible to attest keys that are stored in the Android system—that is,
   * if the value of attestationSecurityLevel is set to Software—you can't trust these attestations
   * if the Android system becomes compromised.
   */
  if (keyDescription.attestationSecurityLevel <= 0) {
    throw new Error(
      `[Android Attestation] Attestation security level too low: ${keyDescription.attestationSecurityLevel}.`
    );
  }

  if (keyDescription.keymasterSecurityLevel <= 0) {
    throw new Error(
      `[Android Attestation] Key master security level too low: ${keyDescription.keymasterSecurityLevel}.`
    );
  }

  // Check challenge
  const receivedChallenge = Buffer.from(
    keyDescription.attestationChallenge.buffer
  ).toString("utf-8");

  if (receivedChallenge !== challenge) {
    throw new Error(
      "[Android Attestation] The received challenge does not match the one contained in the certificate."
    );
  }

  // Check softwareEnforced authorization list
  const softwareEnforced = keyDescription.softwareEnforced.find(
    (softwareEnforced) =>
      softwareEnforced.attestationApplicationId !== undefined
  );

  if (!softwareEnforced || !softwareEnforced.attestationApplicationId) {
    throw new Error(
      `[Android Attestation] Unable to found attestationApplicationId in key attestation.`
    );
  }

  const attestationApplicationId = AsnConvert.parse(
    Buffer.from(softwareEnforced.attestationApplicationId.buffer),
    AttestationApplicationId
  );

  // Check package name
  const packageInfo = attestationApplicationId.packageInfos.find(
    (packageInfo) => packageInfo.packageName.byteLength > 0
  );

  if (!packageInfo) {
    throw new Error(
      `[Android Attestation] Unable to found packageInfo in key attestation.`
    );
  }

  const packageName = Buffer.from(
    packageInfo.packageName as unknown as ArrayBuffer
  ).toString("utf-8");

  if (packageName !== bundleIdentifier) {
    throw new Error(
      `[Android Attestation] The bundle identifier ${packageName} does not match ${bundleIdentifier}.`
    );
  }

  // Check teeEnforced Root Of Trust
  const teeEnforcedWithRoT = keyDescription.teeEnforced.find(
    (el) => el.rootOfTrust
  );
  if (!teeEnforcedWithRoT || !teeEnforcedWithRoT.rootOfTrust) {
    throw new Error(
      `[Android Attestation] Unable to found a Root Of Trust in teeEnforced data.`
    );
  }

  const rootOfTrust = teeEnforcedWithRoT.rootOfTrust;

  // Check if bootloader in locked
  if (!rootOfTrust.deviceLocked) {
    throw new Error(`[Android Attestation] BootLoader unlocked!`);
  }

  /*
   * This data structure provides the device's current boot state,
   * which represents the level of protection provided to the user and to
   * apps after the device finishes booting.
   *
   * This data structure is an enumeration, so it takes on exactly one of the following values:
   * 0) Verified
   * 1) SelfSigned
   * 2) Unverified
   * 3) Failed
   */
  if (rootOfTrust.verifiedBootState !== 0) {
    throw new Error(
      `[Android Attestation] VerifiedBootState is not verified: ${rootOfTrust.verifiedBootState}`
    );
  }
};
