import { ANDROID_CRL_URL, GOOGLE_PUBLIC_KEY } from "@/app/config";
import { X509Certificate } from "crypto";
import { describe, expect, it } from "vitest";

import { base64ToPem } from "..";
import { verifyAttestation } from "../attestation";
import { androidMockData } from "./config";

describe("AndroidAttestationValidation", () => {
  const { attestation, hardwareKey } = androidMockData;

  const data = Buffer.from(attestation, "base64");
  const x509ChainString = data.toString("utf-8").split(",");

  const x509Chain = x509ChainString.map(
    (el) => new X509Certificate(base64ToPem(el)),
  );

  it("should return a validated attestation", async () => {
    const result = verifyAttestation({
      androidCrlUrl: ANDROID_CRL_URL,
      bundleIdentifier: "com.ioreactnativeintegrityexample",
      challenge: "randomvalue",
      googlePublicKey: GOOGLE_PUBLIC_KEY,
      x509Chain,
    });
    const expectedResult = {
      hardwareKey,
    };

    await expect(result).resolves.toEqual(expectedResult);
  });
});
