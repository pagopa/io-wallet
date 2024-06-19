import { createHash, createVerify } from "crypto";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import { google, playintegrity_v1 } from "googleapis";
import { exportSPKI, importJWK } from "jose";
import { JwkPublicKey } from "io-wallet-common/jwk";

const ALLOWED_WINDOW_MILLIS = 1000 * 60 * 15; // 15 minutes

export const GoogleAppCredentials = t.type({
  type: NonEmptyString,
  project_id: NonEmptyString,
  private_key_id: NonEmptyString,
  private_key: NonEmptyString,
  client_email: EmailString,
  client_id: NonEmptyString,
  auth_uri: NonEmptyString,
  token_uri: NonEmptyString,
  auth_provider_x509_cert_url: NonEmptyString,
  client_x509_cert_url: NonEmptyString,
  universe_domain: NonEmptyString,
});

export type GoogleAppCredentials = t.TypeOf<typeof GoogleAppCredentials>;

export type VerifyAssertionParams = {
  integrityAssertion: NonEmptyString;
  hardwareSignature: string;
  clientData: string;
  hardwareKey: JwkPublicKey;
  bundleIdentifier: string;
  androidPlayStoreCertificateHash: string;
  googleAppCredentials: GoogleAppCredentials;
  androidPlayIntegrityUrl: string;
  allowDevelopmentEnvironment: boolean;
};

export const playintegrity = google.playintegrity("v1");

export const verifyAssertion = async (params: VerifyAssertionParams) => {
  const {
    integrityAssertion,
    hardwareSignature,
    clientData,
    hardwareKey,
    bundleIdentifier,
    androidPlayStoreCertificateHash,
    googleAppCredentials,
    androidPlayIntegrityUrl,
    allowDevelopmentEnvironment,
  } = params;

  // First check whether the clientData has been signed correctly with the hardware key
  const signatureValidated = validateAssertionSignature(
    hardwareKey,
    clientData,
    hardwareSignature
  );

  if (!signatureValidated) {
    throw new Error("[Android Assertion] Invalid hardware signature");
  }

  // Then verify the integrity token
  const jwtClient = new google.auth.JWT(
    googleAppCredentials.client_email,
    undefined,
    googleAppCredentials.private_key,
    [androidPlayIntegrityUrl]
  );

  google.options({ auth: jwtClient });
  const result = await playintegrity.v1.decodeIntegrityToken({
    packageName: bundleIdentifier,
    requestBody: {
      integrityToken: integrityAssertion,
    },
  });

  const tokenPayloadExternal = result.data.tokenPayloadExternal;

  if (!tokenPayloadExternal) {
    throw new Error(
      "[Android Assertion] Invalid token payload from Play Integrity API response"
    );
  }

  const responseValidated = validateIntegrityResponse(
    tokenPayloadExternal,
    bundleIdentifier,
    clientData,
    allowDevelopmentEnvironment,
    androidPlayStoreCertificateHash
  );

  if (!responseValidated) {
    throw new Error(
      "[Android Assertion] Integrity Response did not pass validation"
    );
  }
};

export const validateAssertionSignature = async (
  hardwareKey: JwkPublicKey,
  clientData: string,
  hardwareSignature: string
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
  androidPlayStoreCertificateHash: string
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
      `The bundle identifier ${requestDetails.requestPackageName} does not match ${bundleIdentifier}.`
    );
  }

  const clientDataHash = createHash("sha256").update(clientData).digest("hex");

  if (requestDetails.requestHash !== clientDataHash) {
    throw new Error(
      `The client data hash ${requestDetails.requestHash} does not match ${clientDataHash}.`
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
      `The app does not match the versions distributed by Google Play.`
    );
  }

  if (appIntegrity.packageName !== bundleIdentifier) {
    throw new Error(
      `The package name ${appIntegrity.packageName} does not match ${bundleIdentifier}.`
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
      `The app certificate does not match the versions distributed by Google Play.`
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
      `[Android Assertion] The user doesn't have an app entitlement.`
    );
  }

  return true;
};
