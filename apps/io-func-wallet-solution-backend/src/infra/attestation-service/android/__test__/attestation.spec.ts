import { it, expect, describe } from "vitest";
import { verifyAttestation } from "../attestation";

import { androidMockData } from "./config";
import { X509Certificate } from "crypto";
import { base64ToPem } from "..";
import { ANDROID_CRL_URL, GOOGLE_PUBLIC_KEY } from "@/app/config";

describe("AndroidAttestationValidation", () => {
  const { hardwareKey, attestation } = androidMockData;

  const data = Buffer.from(attestation, "base64");
  const x509ChainString = data.toString("utf-8").split(",");

  const x509Chain = x509ChainString.map(
    (el) => new X509Certificate(base64ToPem(el))
  );

  it("should return a validated attestation", async () => {
    const result = verifyAttestation({
      x509Chain,
      googlePublicKey: GOOGLE_PUBLIC_KEY,
      challenge: "randomvalue",
      bundleIdentifier: "com.ioreactnativeintegrityexample",
      androidCrlUrl: ANDROID_CRL_URL,
    });
    const expectedResult = {
      hardwareKey,
    };

    await expect(result).resolves.toEqual(expectedResult);
  });
});
