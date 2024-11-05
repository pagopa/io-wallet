import {
  ANDROID_CRL_URL,
  GOOGLE_PUBLIC_KEY,
  decodeBase64String,
} from "@/app/config";
import { X509Certificate } from "crypto";
import { describe, expect, it } from "vitest";

import { base64ToPem } from "..";
import { AndroidAttestationError } from "../../errors";
import { validateRevocation, verifyAttestation } from "../attestation";
import { androidMockData } from "./config";

describe("AndroidAttestationValidation", () => {
  const { attestation, hardwareKey, revokedX509Chain, validX509Chain } =
    androidMockData;

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

  it("should return a validated attestation", async () => {
    const validChain = validX509Chain.map((c) => new X509Certificate(c));
    const validation = await validateRevocation(
      validChain,
      ANDROID_CRL_URL,
      4000,
    );
    expect(validation).toBe(validChain);
  });

  it("should return an exception for revoked chain", async () => {
    const invalidChain = revokedX509Chain.map((c) => new X509Certificate(c));

    await expect(
      validateRevocation(invalidChain, ANDROID_CRL_URL, 4000),
    ).rejects.toThrow(AndroidAttestationError);
  });
});
