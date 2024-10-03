import {
  ANDROID_CRL_URL,
  GOOGLE_PUBLIC_KEY,
  decodeBase64String,
} from "@/app/config";
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
      bundleIdentifiers: ["com.ioreactnativeintegrityexample"],
      challenge: "randomvalue",
      googlePublicKey: decodeBase64String(GOOGLE_PUBLIC_KEY),
      httpRequestTimeout: 1000,
      skipChainValidation: false,
      x509Chain,
    });
    const expectedResult = {
      deviceDetails: {
        attestationSecurityLevel: 2,
        attestationVersion: 4,
        bootPatchLevel: "20230805",
        deviceLocked: true,
        keymasterSecurityLevel: 2,
        keymasterVersion: 41,
        osPatchLevel: 202308,
        osVersion: 130000,
        platform: "android",
        vendorPatchLevel: "20230805",
        verifiedBootState: 0,
        x509Chain: x509Chain.map((el) => el.toString()),
      },
      hardwareKey,
    };

    await expect(result).resolves.toEqual(expectedResult);
  });
});
