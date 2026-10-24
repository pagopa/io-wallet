import {
  AttestationApplicationId,
  NonStandardKeyDescription,
  RootOfTrust,
} from "@peculiar/asn1-android";
import { AsnConvert } from "@peculiar/asn1-schema";
import * as asn1js from "asn1js";
import { createPublicKey, X509Certificate } from "crypto";
import * as E from "fp-ts/Either";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";
import * as jose from "jose";
import * as pkijs from "pkijs";

import { CRL, validateIssuance, validateRevocation } from "@/certificates";

/**
 * Key attestation extension data schema OID
 * https://developer.android.com/privacy-and-security/security-key-attestation#key_attestation_ext_schema
 */
const KEY_OID = "1.3.6.1.4.1.11129.2.1.17";

/**
 * Requirements on the app attest key (API 31+) which can attest the key.
 * Its public key is pinned at the wallet instance registration, so that fresh key attestations
 * sent along with the integrity assertions can be verified to come from the registered device.
 */
export interface AttestKeyRequirement {
  /** The attest key pinned at registration: the attestation must have been signed by it. */
  pinned?: JwkPublicKey;
  /** Whether an attest key is required for devices running an allowed self-signed OS (GrapheneOS). */
  requiredForSelfSigned?: boolean;
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

interface VerifyAttestationParams {
  attestationCrl: CRL;
  attestKey?: AttestKeyRequirement;
  bundleIdentifiers: string[];
  challenge: string;
  googlePublicKeys: string[];
  /**
   * Hex encoded SHA-256 digests of the app signing certificates, enforced for a self-signed OS only,
   * which is rejected when they are empty as its app integrity can't be verified otherwise.
   */
  signatureDigests?: string[];
  /** Hex encoded verified boot keys of the allowed self-signed OS (GrapheneOS). */
  trustedSelfSignedBootKeys?: ReadonlySet<string>;
  x509Chain: readonly X509Certificate[];
}

/**
 * Verified boot state values.
 * https://source.android.com/docs/security/features/keystore/attestation#verifiedbootstate-values
 */
const VERIFIED_BOOT_STATE_VERIFIED = 0;
const VERIFIED_BOOT_STATE_SELF_SIGNED = 1;

/**
 * Key origin and purpose values.
 * https://source.android.com/docs/security/features/keystore/tags
 */
const KEY_ORIGIN_GENERATED = 0;
const KEY_PURPOSE_ATTEST_KEY = 7;

const NON_RKP_ROOT_SUBJECT = "serialnumber=f92009e853b6b045";

export const isNonRkpChain = (x509Chain: readonly X509Certificate[]) => {
  const rootCertificate = x509Chain[x509Chain.length - 1];

  const normalizedSubject = rootCertificate.subject
    .toLowerCase()
    .replace(/\s+/g, "");

  return normalizedSubject === NON_RKP_ROOT_SUBJECT;
};

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
  const isNonRkp = isNonRkpChain(x509Chain);

  const issuanceValidationResult = validateIssuance(x509Chain, publicKeys, {
    skipIntermediateExpirationValidation: isNonRkp,
    skipLeafAndRootExpirationValidation: true,
  });

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

  const { attestKey, leaf } = validateKeyAttestationExtension(
    x509Chain,
    KEY_OID,
  );

  const validateExtensionResult = await validateExtension(leaf, params);

  if (!validateExtensionResult.success) {
    return validateExtensionResult;
  }

  const validateAttestKeyResult = await validateAttestKey(
    leaf,
    attestKey,
    validateExtensionResult.deviceDetails,
    params,
  );

  if (!validateAttestKeyResult.success) {
    return validateAttestKeyResult;
  }

  const deviceDetails = {
    ...validateExtensionResult.deviceDetails,
    ...(validateAttestKeyResult.attestKey && {
      attestKey: validateAttestKeyResult.attestKey,
    }),
    x509Chain: x509Chain.map((x509) => x509.toString()),
  };

  return {
    deviceDetails,
    hardwareKey: validateExtensionResult.hardwareKey,
    success: true,
  };
};

/**
 * Finds the certificates that contain the key attestation certificate extension.
 * Only the leaf certificate and, when the key has been attested by an app attest key (API 31+),
 * the attest key certificate which immediately follows it can contain the extension.
 * Any other position is rejected. This prevents an adversary from attesting an attestation record
 * of their choice with an otherwise trusted chain using the following attack:
 * 1) having the TEE attest a key under the adversary's control,
 * 2) using that key to sign a new leaf certificate with an attestation extension that has their chosen attestation record, then
 * 3) appending that certificate to the original certificate chain.
 * The attest key is also required to have only the ATTEST_KEY purpose, which the secure hardware
 * enforces by using it only to sign attestations, see {@link validateAttestKey}.
 * @param x509Chain - The chain of X509Certificate certificates
 * @param keyOid - The OID of the key attestation extension
 * @returns The leaf certificate with the key attestation extension and the attest key one, if any
 * @throws {Error} If no key attestation extension is found or it is in an unexpected position
 */
function validateKeyAttestationExtension(
  x509Chain: readonly X509Certificate[],
  keyOid: string,
): { attestKey?: CertWithExtension; leaf: CertWithExtension } {
  const certificatesWithExtension = x509Chain.map((certificate) => {
    const extension = extractExtension(certificate, keyOid);
    return extension ? { certificate, extension } : undefined;
  });
  const [leaf, attestKey, ...others] = certificatesWithExtension;
  if (!leaf) {
    throw new Error("No key attestation extension found");
  }
  if (others.some((certificate) => certificate !== undefined)) {
    throw new Error("Unexpected key attestation extension in the chain");
  }
  return { attestKey, leaf };
}

/**
 * Parses the key attestation extension of a certificate.
 * @param certWithExtension - The certificate containing the key attestation extension
 * @returns The parsed key description
 */
const parseKeyDescription = (certWithExtension: CertWithExtension) =>
  AsnConvert.parse(
    certWithExtension.extension.extnValue.getValue(),
    NonStandardKeyDescription,
  );

/**
 * Parses the attestation application id of a key description.
 * @param keyDescription - The parsed key description
 * @returns The package names and the hex encoded signature digests
 */
const parseApplicationId = (keyDescription: NonStandardKeyDescription) => {
  const encoded = keyDescription.softwareEnforced.findProperty(
    "attestationApplicationId",
  );
  if (!encoded) {
    return undefined;
  }
  const applicationId = AsnConvert.parse(
    Buffer.from(encoded.buffer),
    AttestationApplicationId,
  );
  return {
    packageNames: applicationId.packageInfos.map((packageInfo) =>
      Buffer.from(packageInfo.packageName as unknown as ArrayBuffer).toString(
        "utf-8",
      ),
    ),
    // An empty SET OF is decoded as undefined
    signatureDigests: (applicationId.signatureDigests ?? []).map((digest) =>
      Buffer.from(digest as unknown as ArrayBuffer).toString("hex"),
    ),
  };
};

/**
 * Checks that the attest key is consistent with the key it attested.
 * @param leafDescription - The key description of the attested key
 * @param attestKeyDescription - The key description of the attest key
 * @returns The reason of the inconsistency, undefined if consistent
 */
const checkAttestKeyConsistency = (
  leafDescription: NonStandardKeyDescription,
  attestKeyDescription: NonStandardKeyDescription,
): string | undefined => {
  const purposes = attestKeyDescription.teeEnforced.findProperty("purpose");
  if (purposes?.length !== 1 || purposes[0] !== KEY_PURPOSE_ATTEST_KEY) {
    return "Attest key has invalid purposes.";
  }
  if (
    attestKeyDescription.teeEnforced.findProperty("origin") !==
    KEY_ORIGIN_GENERATED
  ) {
    return "Attest key has not been generated by the device.";
  }
  if (
    attestKeyDescription.attestationSecurityLevel !==
      leafDescription.attestationSecurityLevel ||
    attestKeyDescription.keymasterSecurityLevel !==
      leafDescription.keymasterSecurityLevel
  ) {
    return "Attest key security level does not match.";
  }
  const leafRootOfTrust =
    leafDescription.teeEnforced.findProperty("rootOfTrust");
  const attestKeyRootOfTrust =
    attestKeyDescription.teeEnforced.findProperty("rootOfTrust");
  if (
    !leafRootOfTrust ||
    !attestKeyRootOfTrust ||
    attestKeyRootOfTrust.deviceLocked !== leafRootOfTrust.deviceLocked ||
    attestKeyRootOfTrust.verifiedBootState !==
      leafRootOfTrust.verifiedBootState ||
    !Buffer.from(attestKeyRootOfTrust.verifiedBootKey.buffer).equals(
      Buffer.from(leafRootOfTrust.verifiedBootKey.buffer),
    )
  ) {
    return "Attest key root of trust does not match.";
  }
  if (
    JSON.stringify(parseApplicationId(attestKeyDescription)) !==
    JSON.stringify(parseApplicationId(leafDescription))
  ) {
    return "Attest key application does not match.";
  }
  return undefined;
};

/**
 * Validates the app attest key which signed the attested key, as done by the GrapheneOS Auditor app:
 * it must be a generated key which can only be used to attest other keys, with the same security level,
 * root of trust and app of the attested key. When the attest key has been pinned at registration, the
 * attestation must have been signed by it, otherwise it must have been generated with the same challenge.
 * An attest key is required for devices running an allowed self-signed OS when configured.
 * https://github.com/GrapheneOS/Auditor
 * @param leaf - The certificate of the attested key
 * @param attestKey - The certificate of the attest key, if any
 * @param deviceDetails - The device details of the attested key
 * @param params - The verify attestation parameters
 * @returns The validation result with the attest key public key, if any
 */
const validateAttestKey = async (
  leaf: CertWithExtension,
  attestKey: CertWithExtension | undefined,
  deviceDetails: AndroidDeviceDetails,
  params: VerifyAttestationParams,
): Promise<
  | { attestKey?: JwkPublicKey; success: true }
  | { reason: string; success: false }
> => {
  const requirement = params.attestKey ?? {};
  if (!attestKey) {
    if (requirement.pinned) {
      return {
        reason: "The key has not been attested by the registered attest key.",
        success: false,
      };
    }
    if (
      requirement.requiredForSelfSigned &&
      deviceDetails.verifiedBootState === VERIFIED_BOOT_STATE_SELF_SIGNED
    ) {
      return {
        reason: "An attest key is required for a self-signed OS.",
        success: false,
      };
    }
    return { success: true };
  }

  const leafDescription = parseKeyDescription(leaf);
  const attestKeyDescription = parseKeyDescription(attestKey);
  const inconsistency = checkAttestKeyConsistency(
    leafDescription,
    attestKeyDescription,
  );
  if (inconsistency) {
    return { reason: inconsistency, success: false };
  }

  const attestKeyJwk = JwkPublicKey.decode(
    await jose.exportJWK(attestKey.certificate.publicKey),
  );
  if (E.isLeft(attestKeyJwk)) {
    return { reason: "Invalid attest key.", success: false };
  }
  if (requirement.pinned) {
    const [pinnedThumbprint, attestKeyThumbprint] = await Promise.all([
      jose.calculateJwkThumbprint(requirement.pinned),
      jose.calculateJwkThumbprint(attestKeyJwk.right),
    ]);
    if (pinnedThumbprint !== attestKeyThumbprint) {
      return {
        reason: "The key has not been attested by the registered attest key.",
        success: false,
      };
    }
  } else if (
    Buffer.from(attestKeyDescription.attestationChallenge.buffer).toString(
      "utf-8",
    ) !== params.challenge
  ) {
    return {
      reason: "The attest key challenge does not match.",
      success: false,
    };
  }

  return { attestKey: attestKeyJwk.right, success: true };
};

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
 * Checks the app signing certificate and the verified boot state.
 *
 * The verified boot state represents the level of protection provided to the user and to apps after
 * the device finishes booting. It takes on exactly one of the following values:
 * 0) Verified
 * 1) SelfSigned
 * 2) Unverified
 * 3) Failed
 *
 * Following the GrapheneOS attestation compatibility guide, a self-signed OS is accepted when its
 * verified boot key is one of the official GrapheneOS ones, while no patch level is enforced.
 * The app signing certificate is the only app integrity proof for a self-signed OS, as the
 * Play Integrity app recognition verdict is not available, thus it is required in that case.
 * https://grapheneos.org/articles/attestation-compatibility-guide
 * @param attestationApplicationId - The attestation application id
 * @param rootOfTrust - The root of trust
 * @param attestationParams - The verify attestation parameters
 * @returns The reason of the failure, undefined if the checks pass
 */
const checkAppSigningAndBootState = (
  attestationApplicationId: AttestationApplicationId,
  rootOfTrust: RootOfTrust,
  attestationParams: VerifyAttestationParams,
): string | undefined => {
  const allowedSignatureDigests = new Set(
    (attestationParams.signatureDigests ?? []).map((digest) =>
      digest.toLowerCase(),
    ),
  );
  const signatureDigests = (
    attestationApplicationId.signatureDigests ?? []
  ).map((digest) =>
    Buffer.from(digest as unknown as ArrayBuffer).toString("hex"),
  );

  if (rootOfTrust.verifiedBootState === VERIFIED_BOOT_STATE_SELF_SIGNED) {
    const verifiedBootKey = Buffer.from(
      rootOfTrust.verifiedBootKey.buffer,
    ).toString("hex");
    // For the stock OS the app integrity is verified with Play Integrity, so the digests
    // are only enforced for a self-signed OS to avoid affecting the existing builds
    if (allowedSignatureDigests.size === 0) {
      return "App signing certificate digests are required to accept a self-signed OS.";
    }
    if (
      !signatureDigests.some((digest) => allowedSignatureDigests.has(digest))
    ) {
      return "The app signing certificate does not match the expected ones.";
    }
    if (!attestationParams.trustedSelfSignedBootKeys?.has(verifiedBootKey)) {
      return `VerifiedBootKey of the self-signed OS is not allowed: ${verifiedBootKey}`;
    }
    return undefined;
  }
  if (rootOfTrust.verifiedBootState !== VERIFIED_BOOT_STATE_VERIFIED) {
    return `VerifiedBootState is not verified: ${rootOfTrust.verifiedBootState}`;
  }
  return undefined;
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
          verifiedBootKey: Buffer.from(
            rootOfTrust.verifiedBootKey.buffer,
          ).toString("hex"),
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

  const appAndBootStateError = checkAppSigningAndBootState(
    attestationApplicationId,
    rootOfTrust,
    attestationParams,
  );
  if (appAndBootStateError) {
    return { reason: appAndBootStateError, success: false };
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
