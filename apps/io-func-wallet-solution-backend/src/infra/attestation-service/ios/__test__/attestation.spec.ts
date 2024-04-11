import { it, expect, describe } from "vitest";
import { verifyAttestation } from "../attestation";
import { APPLE_APP_ATTESTATION_ROOT_CA } from "../../../../app/config";
import { decode } from "cbor-x";

import { iOSMockAttestationData } from "./config";

describe("iOSAttestationValidation", async () => {
  const {
    challenge,
    attestation,
    keyId,
    hardwareKey,
    bundleIdentifier,
    teamIdentifier,
  } = iOSMockAttestationData;

  const data = Buffer.from(attestation, "base64");
  const decodedAttestation = decode(data);

  it("should return a validated attestation", async () => {
    const result = await verifyAttestation({
      decodedAttestation,
      challenge,
      keyId,
      bundleIdentifier,
      teamIdentifier,
      allowDevelopmentEnvironment: true,
      appleRootCertificate: APPLE_APP_ATTESTATION_ROOT_CA,
    });

    const expectedResult = {
      hardwareKey,
    };
    expect(result).toEqual(expectedResult);
  });

  it("should return throw an Error", async () => {
    try {
      await verifyAttestation({
        decodedAttestation,
        challenge: "invalidChallenge",
        keyId,
        bundleIdentifier,
        teamIdentifier,
        allowDevelopmentEnvironment: true,
        appleRootCertificate: APPLE_APP_ATTESTATION_ROOT_CA,
      });
    } catch (error) {
      expect(error);
    }
  });
});
