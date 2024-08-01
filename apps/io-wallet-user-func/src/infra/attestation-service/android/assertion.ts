import { JwkPublicKey } from "@/jwk";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createHash, createVerify } from "crypto";
import { google, playintegrity_v1 } from "googleapis";
import * as t from "io-ts";
import { exportSPKI, importJWK } from "jose";

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

export const verifyAssertion = async (params: VerifyAssertionParams) => {
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

  // First check whether the clientData has been signed correctly with the hardware key
  const signatureValidated = validateAssertionSignature(
    hardwareKey,
    clientData,
    hardwareSignature,
  );

  if (!signatureValidated) {
    throw new Error("[Android Assertion] Invalid hardware signature");
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
      } catch (e) {
        /* If it fails I continue the for loop anyway to try other bundleIdentifiers.
         * The check is still done at the end on the value of responseValidated
         */
      }
    }
  }

  if (!tokenPayloadExternal || !bundleIdentifier) {
    throw new Error(
      "[Android Assertion] Invalid token payload from Play Integrity API response",
    );
  }

  if (!responseValidated) {
    throw new Error(
      "[Android Assertion] Integrity Response did not pass validation",
    );
  }
};

export const validateAssertionSignature = async (
  hardwareKey: JwkPublicKey,
  clientData: string,
  hardwareSignature: string,
) => {
  const joseHardwareKey = await importJWK(hardwareKey);
  if (!("type" in joseHardwareKey)) {
    throw new Error("[Android Assertion] Invalid Hardware Key format");
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
) => {
  /**
   * 1. You must first check that the values in the requestDetails field match those of the original
   * request before checking each integrity verdict. Verify the requestDetails part of the JSON payload
   * by making sure that the requestPackageName and requestHash match what was sent in the original request
   */

  const requestDetails = integrityResponse.requestDetails;

  if (!requestDetails) {
    throw new Error("[Android Assertion] Invalid requestDetails");
  }

  if (requestDetails.requestPackageName !== bundleIdentifier) {
    throw new Error(
      `The bundle identifier ${requestDetails.requestPackageName} does not match ${bundleIdentifier}.`,
    );
  }

  const clientDataHash = createHash("sha256").update(clientData).digest("hex");

  if (requestDetails.requestHash !== clientDataHash) {
    throw new Error(
      `The client data hash ${requestDetails.requestHash} does not match ${clientDataHash}.`,
    );
  }

  if (!requestDetails.timestampMillis) {
    throw new Error("[Android Assertion] Invalid timestamp");
  }

  const tsMills = parseInt(requestDetails.timestampMillis, 10);
  const tsMillsDiff = new Date().getTime() - new Date(tsMills).getTime();

  if (tsMillsDiff > ALLOWED_WINDOW_MILLIS) {
    throw new Error("[Android Assertion] It's been too long since the request");
  }

  /**
   * 2. To ensure that the token was generated by an app that was created by you,
   * verify that the application integrity is as expected.
   */

  const appIntegrity = integrityResponse.appIntegrity;
  if (!appIntegrity) {
    throw new Error(`[Android Assertion] Invalid App Integrity field.`);
  }

  if (
    !allowDevelopmentEnvironment &&
    appIntegrity.appRecognitionVerdict !== "PLAY_RECOGNIZED"
  ) {
    throw new Error(
      `The app does not match the versions distributed by Google Play.`,
    );
  }

  if (appIntegrity.packageName !== bundleIdentifier) {
    throw new Error(
      `The package name ${appIntegrity.packageName} does not match ${bundleIdentifier}.`,
    );
  }

  const certificateSha256Digest = appIntegrity.certificateSha256Digest;
  if (!certificateSha256Digest) {
    throw new Error(`[Android Assertion] Certificate digest not present`);
  }

  if (
    !allowDevelopmentEnvironment &&
    certificateSha256Digest.indexOf(androidPlayStoreCertificateHash) === -1
  ) {
    throw new Error(
      `The app certificate does not match the versions distributed by Google Play.`,
    );
  }

  /**
   * 3. The deviceIntegrity field can contain a single value, deviceRecognitionVerdict,
   * that has one or more labels representing how well a device can enforce app integrity.
   * If a device does not meet the criteria of any labels, the deviceIntegrity field is empty.
   */

  const deviceIntegrity = integrityResponse.deviceIntegrity;
  if (!deviceIntegrity) {
    throw new Error(`[Android Assertion] Invalid Device Integrity field.`);
  }

  const deviceRecognitionVerdict = deviceIntegrity.deviceRecognitionVerdict;
  if (!deviceRecognitionVerdict || deviceRecognitionVerdict.length <= 0) {
    throw new Error(`[Android Assertion] Invalid Device Recognition Verdict.`);
  }

  if (deviceRecognitionVerdict.indexOf("MEETS_DEVICE_INTEGRITY") === -1) {
    throw new Error("[Android Assertion] Device no meets integrity check");
  }

  /**
   * 4. To check that the user has an app entitlement for your app, verify that the appLicensingVerdict is LICENSED
   */
  const accountDetails = integrityResponse.accountDetails;
  if (!accountDetails) {
    throw new Error(`[Android Assertion] Invalid Account Details field.`);
  }

  if (
    !allowDevelopmentEnvironment &&
    accountDetails.appLicensingVerdict !== "LICENSED"
  ) {
    throw new Error(
      `[Android Assertion] The user doesn't have an app entitlement.`,
    );
  }

  return true;
};
