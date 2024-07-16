import {
  APPLE_APP_ATTESTATION_ROOT_CA,
  decodeBase64String,
} from "@/app/config";
import { decode } from "cbor-x";
import { describe, expect, it } from "vitest";

import { verifyAttestation } from "../attestation";
import { iOSMockData } from "./config";

describe("iOSAttestationValidation", () => {
  const {
    attestation,
    bundleIdentifier,
    challenge,
    hardwareKey,
    keyId,
    teamIdentifier,
  } = iOSMockData;

  const data = Buffer.from(attestation, "base64");
  const decodedAttestation = decode(data);

  it("should return a validated attestation", async () => {
    const result = verifyAttestation({
      allowDevelopmentEnvironment: true,
      appleRootCertificate: decodeBase64String(APPLE_APP_ATTESTATION_ROOT_CA),
      bundleIdentifier,
      challenge,
      decodedAttestation,
      keyId,
      teamIdentifier,
    });
    const expectedResult = {
      hardwareKey,
    };

    await expect(result).resolves.toEqual(expectedResult);
  });

  it("should reject", async () => {
    await expect(
      verifyAttestation({
        allowDevelopmentEnvironment: true,
        appleRootCertificate: APPLE_APP_ATTESTATION_ROOT_CA,
        bundleIdentifier,
        challenge: "invalidChallenge",
        decodedAttestation,
        keyId,
        teamIdentifier,
      }),
    ).rejects.toThrow();
  });
});
