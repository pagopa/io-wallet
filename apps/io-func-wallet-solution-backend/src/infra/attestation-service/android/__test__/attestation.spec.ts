import { it, expect, describe } from "vitest";
import { verifyAttestation } from "../attestation";

import { androidMockAttestationData } from "./config";
import { X509Certificate } from "crypto";
import { GOOGLE_PUBLIC_KEY } from "../../../../app/config";
import { base64ToPem } from "..";

describe("AndroidAttestationValidation", async () => {
  const { challenge, attestation, keyId } = androidMockAttestationData;

  const data = Buffer.from(attestation, "base64");
  const x509ChainString = data.toString("utf-8").split(",");

  const x509Chain = x509ChainString.map(
    (el) => new X509Certificate(base64ToPem(el))
  );

  it("should return a validated attestation", async () => {
    const result = await verifyAttestation({
      x509Chain,
      googlePublicKey: GOOGLE_PUBLIC_KEY,
      challenge: "randomvalue",
      bundleIdentifier: "com.ioreactnativeintegrityexample",
    });

    const expectedResult = {
      environment: "development",
      keyId: keyId,
      hardwareKey: "",
    };
    expect(result).toEqual(expectedResult);
  });
});
