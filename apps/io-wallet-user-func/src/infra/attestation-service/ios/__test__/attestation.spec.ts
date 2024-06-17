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

  it("should return a validated attestation", async () => {
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

    await expect(result).resolves.toEqual(expectedResult);
  });

  it("should reject", async () => {
    await expect(
      verifyAttestation({
        decodedAttestation,
        challenge: "invalidChallenge",
        keyId,
        bundleIdentifier,
        teamIdentifier,
        allowDevelopmentEnvironment: true,
        appleRootCertificate: APPLE_APP_ATTESTATION_ROOT_CA,
      })
    ).rejects.toThrow();
  });
});
