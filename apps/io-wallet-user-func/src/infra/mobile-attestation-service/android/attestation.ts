import {
  AttestationApplicationId,
  NonStandardKeyDescription,
} from "@peculiar/asn1-android";
import { AsnConvert } from "@peculiar/asn1-schema";
import * as asn1js from "asn1js";
import { createPublicKey, X509Certificate } from "crypto";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import * as jose from "jose";
import * as pkijs from "pkijs";

import { CRL, validateIssuance, validateRevocation } from "@/certificates";

/**
 * Key attestation extension data schema OID
 * https://developer.android.com/privacy-and-security/security-key-attestation#key_attestation_ext_schema
 */
const KEY_OID = "1.3.6.1.4.1.11129.2.1.17";

export interface VerifyAttestationParams {
  attestationCrl: CRL;
  bundleIdentifiers: string[];
  challenge: string;
  googlePublicKeys: string[];
  x509Chain: readonly X509Certificate[];
}

type AndroidAttestationValidationResult =
  | {
      deviceDetails: AndroidDeviceDetails;
      hardwareKey: jose.JWK;
      success: true;
    }
  | { reason: string; success: false };

interface CertWithExtension {
  certificate: X509Certificate;
  extension: pkijs.Extension;
}

/**
 * Verifies Android key attestation by validating the certificate chain,
 * checking revocation status, and examining the key attestation extension.
 * @param params - The attestation verification parameters
 * @returns A promise that resolves to the validation result containing device details and hardware key if successful
 */
export const verifyAttestation = async (
  params: VerifyAttestationParams,
): Promise<AndroidAttestationValidationResult> => {
  const { attestationCrl, googlePublicKeys, x509Chain } = params;

  if (x509Chain.length <= 0) {
    return {
      reason: "No certificates provided",
      success: false,
    };
  }

  // 3. Verify that the root public certificate is trustworthy and that each certificate signs the next certificate in the chain.
  const publicKeys = googlePublicKeys.map(createPublicKey);

  const issuanceValidationResult = validateIssuance(x509Chain, publicKeys);

  if (!issuanceValidationResult.success) {
    return issuanceValidationResult;
  }

  // 4. Check each certificate's revocation status to ensure that none of the certificates have been revoked.
  const revocationValidationResult = validateRevocation(
    x509Chain,
    attestationCrl,
  );

  if (!revocationValidationResult.success) {
    return revocationValidationResult;
  }

  const certWithExtension = validateKeyAttestationExtension(x509Chain, KEY_OID);

  const validateExtensionResult = await validateExtension(
    certWithExtension,
    params,
  );

  if (!validateExtensionResult.success) {
    return validateExtensionResult;
  }

  const deviceDetails = {
    ...validateExtensionResult.deviceDetails,
    x509Chain: x509Chain.map((x509) => x509.toString()),
  };

  return {
    deviceDetails,
    hardwareKey: validateExtensionResult.hardwareKey,
    success: true,
  };
};

/**
 * Finds the nearest certificate to the root that contains the key attestation certificate extension.
 * Parse the attestation record that is closest to the root. This prevents an adversary from
 * attesting an attestation record of their choice with an otherwise trusted chain using the
 * following attack:
 * 1) having the TEE attest a key under the adversary's control,
 * 2) using that key to sign a new leaf certificate with an attestation extension that has their chosen attestation record, then
 * 3) appending that certificate to the original certificate chain.
 *
 * If the provisioning information certificate extension was present, the key attestation certificate extension must be in the immediately subsequent certificate.
 * Use the parser to extract the key attestation certificate extension data from that certificate.
 * @param x509Chain - The chain of X509Certificate certificates
 * @param keyOid - The OID of the key attestation extension
 * @returns The certificate with the key attestation extension
 * @throws {Error} If no key attestation extension is found
 */
function validateKeyAttestationExtension(
  x509Chain: readonly X509Certificate[],
  keyOid: string,
): CertWithExtension {
  for (let i = x509Chain.length - 1; i >= 0; i--) {
    const extension = extractExtension(x509Chain[i], keyOid);
    if (extension) {
      return {
        certificate: x509Chain[i],
        extension,
      };
    }
  }
  throw new Error("No key attestation extension found");
}

/**
 * Extracts a specific extension from an X509 certificate by OID.
 * @param certificate - The X509Certificate to extract the extension from
 * @param oid - The OID of the extension to extract
 * @returns The extension if found, undefined otherwise
 */
const extractExtension = (certificate: X509Certificate, oid: string) => {
  const asn1 = asn1js.fromBER(certificate.raw);
  const parsedCertificate = new pkijs.Certificate({ schema: asn1.result });
  return parsedCertificate.extensions?.find((e) => e.extnID === oid);
};

/**
 * Validates the key attestation extension data for consistency and compares with the set of
 * values that are expected for the hardware-backed key to contain.
 * @param certWithExtension - The certificate containing the key attestation extension
 * @param attestationParams - The verify attestation parameters
 * @returns A promise that resolves to the validation result
 */
const validateExtension = async (
  certWithExtension: CertWithExtension,
  attestationParams: VerifyAttestationParams,
): Promise<AndroidAttestationValidationResult> => {
  const { bundleIdentifiers, challenge } = attestationParams;

  const extension = certWithExtension.extension;

  const extensionBerEncoded = extension.extnValue.getValue();

  const keyDescription = AsnConvert.parse(
    extensionBerEncoded,
    NonStandardKeyDescription,
  );

  let deviceDetails = keyDescription.teeEnforced.reduce(
    (detailObj: AndroidDeviceDetails, currentValue) => {
      if (currentValue.osVersion) {
        return { ...detailObj, osVersion: currentValue.osVersion };
      }
      if (currentValue.osPatchLevel) {
        return { ...detailObj, osPatchLevel: currentValue.osPatchLevel };
      }
      if (currentValue.vendorPatchLevel) {
        return {
          ...detailObj,
          vendorPatchLevel: `${currentValue.vendorPatchLevel}`,
        };
      }
      if (currentValue.bootPatchLevel) {
        return {
          ...detailObj,
          bootPatchLevel: `${currentValue.bootPatchLevel}`,
        };
      }
      if (currentValue.rootOfTrust) {
        const rootOfTrust = currentValue.rootOfTrust;
        return {
          ...detailObj,
          deviceLocked: rootOfTrust.deviceLocked,
          verifiedBootState: rootOfTrust.verifiedBootState,
        };
      }
      return detailObj;
    },
    { platform: "android" } as AndroidDeviceDetails,
  );

  deviceDetails = {
    ...deviceDetails,
    attestationSecurityLevel: keyDescription.attestationSecurityLevel,
    attestationVersion: keyDescription.attestationVersion,
    keymasterSecurityLevel: keyDescription.keymasterSecurityLevel,
    keymasterVersion: keyDescription.keymasterVersion,
  };

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
    return {
      reason: `Attestation security level too low: ${keyDescription.attestationSecurityLevel}.`,
      success: false,
    };
  }

  if (keyDescription.keymasterSecurityLevel <= 0) {
    return {
      reason: `Key master security level too low: ${keyDescription.keymasterSecurityLevel}.`,
      success: false,
    };
  }

  // Check challenge
  const receivedChallenge = Buffer.from(
    keyDescription.attestationChallenge.buffer,
  ).toString("utf-8");

  if (receivedChallenge !== challenge) {
    return {
      reason:
        "The received challenge does not match the one contained in the certificate.",
      success: false,
    };
  }

  // Check softwareEnforced authorization list
  const softwareEnforced = keyDescription.softwareEnforced.find(
    (softwareEnforced) =>
      softwareEnforced.attestationApplicationId !== undefined,
  );

  if (!softwareEnforced || !softwareEnforced.attestationApplicationId) {
    return {
      reason: `Unable to found attestationApplicationId in key attestation.`,
      success: false,
    };
  }

  const attestationApplicationId = AsnConvert.parse(
    Buffer.from(softwareEnforced.attestationApplicationId.buffer),
    AttestationApplicationId,
  );

  // Check package name
  const packageInfo = attestationApplicationId.packageInfos.find(
    (packageInfo) => packageInfo.packageName.byteLength > 0,
  );

  if (!packageInfo) {
    return {
      reason: `Unable to found packageInfo in key attestation.`,
      success: false,
    };
  }

  const packageName = Buffer.from(
    packageInfo.packageName as unknown as ArrayBuffer,
  ).toString("utf-8");

  const bundleIdentifiersCheck = bundleIdentifiers.filter(
    (bundleIdentifier) => packageName === bundleIdentifier,
  );

  if (bundleIdentifiersCheck.length === 0) {
    return {
      reason: `The bundle identifier ${packageName} does not match any of ${bundleIdentifiers}.`,
      success: false,
    };
  }

  // Check teeEnforced Root Of Trust
  const teeEnforcedWithRoT = keyDescription.teeEnforced.find(
    (el) => el.rootOfTrust,
  );
  if (!teeEnforcedWithRoT || !teeEnforcedWithRoT.rootOfTrust) {
    return {
      reason: `Unable to found a Root Of Trust in teeEnforced data.`,
      success: false,
    };
  }

  const rootOfTrust = teeEnforcedWithRoT.rootOfTrust;

  // Check if bootloader in locked
  if (!rootOfTrust.deviceLocked) {
    return {
      reason: `BootLoader unlocked!`,
      success: false,
    };
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
    return {
      reason: `VerifiedBootState is not verified: ${rootOfTrust.verifiedBootState}`,
      success: false,
    };
  }

  const hardwareKey = await jose.exportJWK(
    certWithExtension.certificate.publicKey,
  );

  return {
    deviceDetails,
    hardwareKey,
    success: true,
  };
};
