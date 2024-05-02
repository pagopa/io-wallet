import { it, expect, describe } from "vitest";
import { verifyAttestation } from "../attestation";
import { decode } from "cbor-x";

import { iOSMockData } from "./config";
import { APPLE_APP_ATTESTATION_ROOT_CA } from "@/app/config";

describe("iOSAttestationValidation", () => {
  const {
    challenge,
    attestation,
    keyId,
    hardwareKey,
    bundleIdentifier,
    teamIdentifier,
  } = iOSMockData;

  const data = Buffer.from(attestation, "base64");
  const decodedAttestation = decode(data);

  it("should return a validated attestation", () => {
    const result = verifyAttestation({
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

    expect(result).resolves.toEqual(expectedResult);
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
