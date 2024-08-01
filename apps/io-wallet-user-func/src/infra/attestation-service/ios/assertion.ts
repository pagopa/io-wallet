import { JwkPublicKey } from "@/jwk";
import { createHash, createVerify } from "crypto";
import { exportSPKI, importJWK } from "jose";

import { iOsAssertion } from ".";
import { IosAssertionError } from "../errors";

export interface VerifyAssertionParams {
  bundleIdentifiers: string[];
  clientData: string;
  decodedAssertion: iOsAssertion;
  hardwareKey: JwkPublicKey;
  signCount: number;
  skipSignatureValidation: boolean;
  teamIdentifier: string;
}

export const verifyAssertion = async (params: VerifyAssertionParams) => {
  const {
    bundleIdentifiers,
    clientData,
    decodedAssertion,
    hardwareKey,
    signCount,
    skipSignatureValidation,
    teamIdentifier,
  } = params;

  // 1. The input buffer is already decoded so it is used directly here.
  const { authenticatorData, signature } = decodedAssertion;

  // Convert JWK to PEM
  const joseHardwareKey = await importJWK(hardwareKey);

  if (!("type" in joseHardwareKey)) {
    throw new IosAssertionError("Invalid Hardware Key format");
  }

  const publicHardwareKeyPem = await exportSPKI(joseHardwareKey);

  // 2. Compute the SHA256 hash of the client data, and store it as clientDataHash.
  const clientDataHash = createHash("sha256").update(clientData).digest();

  // 3. Compute the SHA256 hash of the concatenation of the authenticator
  // data and the client data hash, and store it as nonce.
  const nonce = createHash("sha256")
    .update(Buffer.concat([authenticatorData, clientDataHash]))
    .digest();

  // 4. Verify the signature using the public key and nonce.
  const verifier = createVerify("SHA256");
  verifier.update(nonce);
  if (
    !skipSignatureValidation &&
    !verifier.verify(publicHardwareKeyPem, signature)
  ) {
    throw new IosAssertionError("invalid signature");
  }

  // 5. Compute the SHA256 hash of your app’s App ID, and verify that it’s the same as the authenticator data’s RP ID hash.

  const bundleIdentifiersCheck = bundleIdentifiers.filter(
    (bundleIdentifier) => {
      const appIdHash = createHash("sha256")
        .update(`${teamIdentifier}.${bundleIdentifier}`)
        .digest("base64");
      const rpiIdHash = authenticatorData.subarray(0, 32).toString("base64");
      return appIdHash === rpiIdHash;
    },
  );

  if (bundleIdentifiersCheck.length === 0) {
    throw new IosAssertionError("appId does not match");
  }

  // 6. Verify that the authenticator data’s counter field is larger than the stored signCount.
  const nextSignCount = authenticatorData.subarray(33, 37).readInt32BE();
  if (nextSignCount <= signCount) {
    throw new IosAssertionError("invalid signCount");
  }
};
