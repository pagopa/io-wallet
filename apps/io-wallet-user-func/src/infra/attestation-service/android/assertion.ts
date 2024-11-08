import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createHash, createVerify } from "crypto";
import { google, playintegrity_v1 } from "googleapis";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { exportSPKI, importJWK } from "jose";

import { ValidationResult } from "../errors";

const ALLOWED_WINDOW_MILLIS = 1000 * 60 * 15; // 15 minutes

export const GoogleAppCredentials = t.type({
  auth_provider_x509_cert_url: NonEmptyString,
  auth_uri: NonEmptyString,
  client_email: EmailString,
  client_id: NonEmptyString,
  client_x509_cert_url: NonEmptyString,
  private_key: NonEmptyString,
  private_key_id: NonEmptyString,
  project_id: NonEmptyString,
  token_uri: NonEmptyString,
  type: NonEmptyString,
  universe_domain: NonEmptyString,
});

export type GoogleAppCredentials = t.TypeOf<typeof GoogleAppCredentials>;

export interface VerifyAssertionParams {
  allowDevelopmentEnvironment: boolean;
  androidPlayIntegrityUrl: string;
  androidPlayStoreCertificateHash: string;
  bundleIdentifiers: string[];
  clientData: string;
  googleAppCredentials: GoogleAppCredentials;
  hardwareKey: JwkPublicKey;
  hardwareSignature: string;
  integrityAssertion: NonEmptyString;
}

export const playintegrity = google.playintegrity("v1");

export const verifyAssertion = async (
  params: VerifyAssertionParams,
): Promise<ValidationResult> => {
  const {
    allowDevelopmentEnvironment,
    androidPlayIntegrityUrl,
    androidPlayStoreCertificateHash,
    bundleIdentifiers,
    clientData,
    googleAppCredentials,
    hardwareKey,
    hardwareSignature,
    integrityAssertion,
  } = params;

  const errors: string[] = [];

  // First check whether the clientData has been signed correctly with the hardware key
  const signatureValidated = validateAssertionSignature(
    hardwareKey,
    clientData,
    hardwareSignature,
  );

  if (!signatureValidated) {
    return {
      reason: "Invalid hardware signature",
      success: false,
    };
  }

  // Then verify the integrity token
  const jwtClient = new google.auth.JWT(
    googleAppCredentials.client_email,
    undefined,
    googleAppCredentials.private_key,
    [androidPlayIntegrityUrl],
  );

  google.options({ auth: jwtClient });

  let bundleIdentifier;
  let tokenPayloadExternal;
  let responseValidated;

  for (const packageName of bundleIdentifiers) {
    const result = await playintegrity.v1.decodeIntegrityToken({
      packageName,
      requestBody: {
        integrityToken: integrityAssertion,
      },
    });

    const token = result.data.tokenPayloadExternal;

    if (token) {
      bundleIdentifier = packageName;
      tokenPayloadExternal = token;

      try {
        responseValidated = validateIntegrityResponse(
          tokenPayloadExternal,
          bundleIdentifier,
          clientData,
          allowDevelopmentEnvironment,
          androidPlayStoreCertificateHash,
        );
        break;
      } catch (error) {
        /* If it fails I continue the for loop anyway to try other bundleIdentifiers.
         * The check is still done at the end on the value of responseValidated
         */
        errors.push(`${error}`);
      }
    } else {
      errors.push(`${result}`);
    }
  }

  if (!tokenPayloadExternal || !bundleIdentifier) {
    return {
      reason: `Invalid token payload from Play Integrity API response: ${errors.join(",")}`,
      success: false,
    };
  }

  if (!responseValidated) {
    return {
      reason: `Integrity Response did not pass validation: ${errors.join(",")}`,
      success: false,
    };
  }

  return { success: true };
};

export const validateAssertionSignature = async (
  hardwareKey: JwkPublicKey,
  clientData: string,
  hardwareSignature: string,
) => {
  const joseHardwareKey = await importJWK(hardwareKey);
  if (!("type" in joseHardwareKey)) {
    throw new Error("Invalid Hardware Key format");
  }
  const publicHardwareKeyPem = await exportSPKI(joseHardwareKey);

  const clientDataHash = createHash("sha256").update(clientData).digest();

  const verifier = createVerify("SHA256");
  verifier.update(clientDataHash);
  return verifier.verify(publicHardwareKeyPem, hardwareSignature, "base64");
};

export const validateIntegrityResponse = (
  integrityResponse: playintegrity_v1.Schema$TokenPayloadExternal,
  bundleIdentifier: string,
  clientData: string,
  allowDevelopmentEnvironment: boolean,
  androidPlayStoreCertificateHash: string,
): ValidationResult => {
  /**
   * 1. You must first check that the values in the requestDetails field match those of the original
   * request before checking each integrity verdict. Verify the requestDetails part of the JSON payload
   * by making sure that the requestPackageName and requestHash match what was sent in the original request
   */

  const requestDetails = integrityResponse.requestDetails;

  if (!requestDetails) {
    return {
      reason: "Invalid requestDetails",
      success: false,
    };
  }

  if (requestDetails.requestPackageName !== bundleIdentifier) {
    return {
      reason: `The bundle identifier ${requestDetails.requestPackageName} does not match ${bundleIdentifier}.`,
      success: false,
    };
  }

  const clientDataHash = createHash("sha256").update(clientData).digest("hex");

  if (requestDetails.requestHash !== clientDataHash) {
    return {
      reason: `The client data hash ${requestDetails.requestHash} does not match ${clientDataHash}.`,
      success: false,
    };
  }

  if (!requestDetails.timestampMillis) {
    return {
      reason: "Invalid timestamp",
      success: false,
    };
  }

  const tsMills = parseInt(requestDetails.timestampMillis, 10);
  const tsMillsDiff = new Date().getTime() - new Date(tsMills).getTime();

  if (tsMillsDiff > ALLOWED_WINDOW_MILLIS) {
    return {
      reason: "It's been too long since the request",
      success: false,
    };
  }

  /**
   * 2. To ensure that the token was generated by an app that was created by you,
   * verify that the application integrity is as expected.
   */

  const appIntegrity = integrityResponse.appIntegrity;
  if (!appIntegrity) {
    return {
      reason: `Invalid App Integrity field.`,
      success: false,
    };
  }

  if (
    !allowDevelopmentEnvironment &&
    appIntegrity.appRecognitionVerdict !== "PLAY_RECOGNIZED"
  ) {
    return {
      reason: `The app does not match the versions distributed by Google Play.`,
      success: false,
    };
  }

  if (appIntegrity.packageName !== bundleIdentifier) {
    return {
      reason: `The package name ${appIntegrity.packageName} does not match ${bundleIdentifier}.`,
      success: false,
    };
  }

  const certificateSha256Digest = appIntegrity.certificateSha256Digest;
  if (!certificateSha256Digest) {
    return {
      reason: `Certificate digest not present`,
      success: false,
    };
  }

  if (
    !allowDevelopmentEnvironment &&
    certificateSha256Digest.indexOf(androidPlayStoreCertificateHash) === -1
  ) {
    return {
      reason: `The app certificate does not match the versions distributed by Google Play.`,
      success: false,
    };
  }

  /**
   * 3. The deviceIntegrity field can contain a single value, deviceRecognitionVerdict,
   * that has one or more labels representing how well a device can enforce app integrity.
   * If a device does not meet the criteria of any labels, the deviceIntegrity field is empty.
   */

  const deviceIntegrity = integrityResponse.deviceIntegrity;
  if (!deviceIntegrity) {
    return {
      reason: `Invalid Device Integrity field.`,
      success: false,
    };
  }

  const deviceRecognitionVerdict = deviceIntegrity.deviceRecognitionVerdict;
  if (!deviceRecognitionVerdict || deviceRecognitionVerdict.length <= 0) {
    return {
      reason: `Invalid Device Recognition Verdict.`,
      success: false,
    };
  }

  if (deviceRecognitionVerdict.indexOf("MEETS_DEVICE_INTEGRITY") === -1) {
    return {
      reason: `Device no meets integrity check.`,
      success: false,
    };
  }

  /**
   * 4. To check that the user has an app entitlement for your app, verify that the appLicensingVerdict is LICENSED
   */
  const accountDetails = integrityResponse.accountDetails;
  if (!accountDetails) {
    return {
      reason: `Invalid Account Details field.`,
      success: false,
    };
  }

  if (
    !allowDevelopmentEnvironment &&
    accountDetails.appLicensingVerdict !== "LICENSED"
  ) {
    return {
      reason: `The user doesn't have an app entitlement.`,
      success: false,
    };
  }

  return { success: true };
};
