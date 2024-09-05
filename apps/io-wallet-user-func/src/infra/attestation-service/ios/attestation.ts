import * as asn1js from "asn1js";
import { X509Certificate, createHash } from "crypto";
import { IosDeviceDetails } from "io-wallet-common/device-details";
import * as jose from "jose";
import * as pkijs from "pkijs";

import { iOsAttestation } from ".";
import { IosAttestationError } from "../errors";

const APPATTESTDEVELOP = Buffer.from("appattestdevelop").toString("hex");
const APPATTESTPROD = Buffer.concat([
  Buffer.from("appattest"),
  Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
]).toString("hex");

export interface VerifyAttestationParams {
  allowDevelopmentEnvironment: boolean;
  appleRootCertificate: string;
  bundleIdentifiers: string[];
  challenge: string;
  decodedAttestation: iOsAttestation;
  keyId: string;
  teamIdentifier: string;
}

export const verifyAttestation = async (params: VerifyAttestationParams) => {
  const {
    allowDevelopmentEnvironment,
    appleRootCertificate,
    bundleIdentifiers,
    challenge,
    decodedAttestation,
    keyId,
    teamIdentifier,
  } = params;

  const deviceDetails: IosDeviceDetails = {
    platform: "ios",
  };

  const { attStmt, authData } = decodedAttestation;

  // Convert X509 string to X509Certificate obj
  const rootCertificate = new X509Certificate(appleRootCertificate);
  if (!rootCertificate) {
    throw new IosAttestationError("Invalid Apple root certificate");
  }

  // https://developer.apple.com/documentation/devicecheck/validating_apps_that_connect_to_your_server
  // 1. Verify that the attestation statement’s x5c field contains two certificates, the first of which is the
  //    sub CA certificate and the second of which is the client certificate.

  const certificates = attStmt.x5c.map((data) => new X509Certificate(data));

  const subCaCertificate = certificates.find((certificate) =>
    certificate.issuer.includes("Apple App Attestation Root CA"),
  );

  if (subCaCertificate !== undefined) {
    if (!subCaCertificate.verify(rootCertificate.publicKey)) {
      throw new Error(
        "sub CA certificate is not signed by Apple App Attestation Root CA",
      );
    }
  } else {
    throw new IosAttestationError("no sub CA certificate found");
  }

  const clientCertificate = certificates.find((certificate) =>
    certificate.issuer.includes("Apple App Attestation CA 1"),
  );

  if (clientCertificate !== undefined) {
    if (!clientCertificate.verify(subCaCertificate.publicKey)) {
      throw new Error(
        "client CA certificate is not signed by Apple App Attestation CA 1",
      );
    }
  } else {
    throw new IosAttestationError("no client CA certificate found");
  }

  // 2. Create clientDataHash as the SHA256 hash of the one-time challenge your server sends to your
  //    app before performing the attestation, and append that hash to the end of the authenticator
  //    data (authData from the decoded object).
  const clientDataHash = createHash("sha256").update(challenge).digest();

  const nonceData = Buffer.concat([
    decodedAttestation.authData,
    clientDataHash,
  ]);

  // 3. Generate a new SHA256 hash of the composite item to create nonce.
  const nonce = createHash("sha256").update(nonceData).digest("hex");

  // 4. Obtain the value of the credCert extension with OID 1.2.840.113635.100.8.2, which is a DER-encoded ASN.1
  //    sequence. Decode the sequence and extract the single octet string that it contains. Verify that the
  //    string equals nonce.
  const asn1 = asn1js.fromBER(clientCertificate.raw);
  const certificate = new pkijs.Certificate({ schema: asn1.result });
  const extension = certificate.extensions?.find(
    (e: { extnID: string }) => e.extnID === "1.2.840.113635.100.8.2",
  );

  const actualNonce = Buffer.from(
    extension?.parsedValue.valueBlock.value[0].valueBlock.value[0].valueBlock
      .valueHex,
  ).toString("hex");
  if (actualNonce !== nonce) {
    throw new IosAttestationError("nonce does not match");
  }

  // 5. Create the SHA256 hash of the public key in credCert, and verify that it matches the key identifier from your app
  const publicKey = Buffer.from(
    certificate.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHex,
  );
  const publicKeyHash = createHash("sha256")
    .update(publicKey.toString("hex"), "hex") // Convert publicKey to hexadecimal string
    .digest("base64url");
  if (publicKeyHash !== keyId) {
    throw new IosAttestationError("keyId does not match");
  }

  // 6. Compute the SHA256 hash of your app’s App ID, and verify that it’s the same as the authenticator data’s RP ID hash.
  const bundleIdentifiersCheck = bundleIdentifiers.filter(
    (bundleIdentifier) => {
      const appIdHash = createHash("sha256")
        .update(`${teamIdentifier}.${bundleIdentifier}`)
        .digest("base64");
      const rpiIdHash = authData.subarray(0, 32).toString("base64");
      return appIdHash === rpiIdHash;
    },
  );

  if (bundleIdentifiersCheck.length === 0) {
    throw new IosAttestationError("appId does not match");
  }

  // 7. Verify that the authenticator data’s counter field equals 0.
  const signCount = authData.subarray(33, 37).readInt32BE();

  if (signCount !== 0) {
    throw new IosAttestationError("signCount is not 0");
  }

  // 8. Verify that the authenticator data’s aaguid field is either appattestdevelop if operating in the development
  //    environment, or appattest followed by seven 0x00 bytes if operating in the production environment.
  const aaguid = authData.subarray(37, 53).toString("hex");

  if (aaguid !== APPATTESTDEVELOP && aaguid !== APPATTESTPROD) {
    throw new IosAttestationError("aaguid is not valid");
  }

  if (aaguid === APPATTESTDEVELOP && !allowDevelopmentEnvironment) {
    throw new IosAttestationError("development environment is not allowed");
  }

  // 9. Verify that the authenticator data’s credentialId field is the same as the key identifier.
  const credentialIdLength = authData.subarray(53, 55).readInt16BE();
  const credentialId = authData.subarray(55, 55 + credentialIdLength);

  if (credentialId.toString("base64url") !== keyId) {
    throw new IosAttestationError("credentialId does not match");
  }

  const hardwareKey = await jose.exportJWK(clientCertificate.publicKey);

  return {
    deviceDetails,
    hardwareKey,
  };
};
