import { createHash, createSign, generateKeyPairSync } from "crypto";
import * as E from "fp-ts/lib/Either";
import { playintegrity_v1 } from "googleapis";
import { ECKey } from "io-wallet-common/jwk";
import { exportJWK } from "jose";
import { describe, expect, it } from "vitest";

import {
  validateAssertionSignature,
  validateIntegrityResponse,
} from "../assertion";
import { androidMockData } from "./config";

describe("AndroidAssertionValidation", async () => {
  const { bundleIdentifier, challenge, ephemeralKey } = androidMockData;

  const hardwareKeyPair = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const hardwareKey = await exportJWK(hardwareKeyPair.publicKey);

  const clientData = JSON.stringify({ challenge, jwk: ephemeralKey });
  const clientDataHash = createHash("SHA256").update(clientData).digest();

  const signer = createSign("SHA256");
  signer.update(clientDataHash);
  const hardwareSignature = signer.sign(hardwareKeyPair.privateKey, "base64");

  it("should validate assertion signature", async () => {
    const ecKeyDecoded = ECKey.decode(hardwareKey);

    expect.assertions(1);

    if (E.isRight(ecKeyDecoded)) {
      const signatureValidated = validateAssertionSignature(
        ecKeyDecoded.right,
        clientData,
        hardwareSignature,
      );

      await expect(signatureValidated).resolves.toEqual(true);
    }
  });

  it("should validate integrity response", () => {
    const fakeTokenpayloadIntegrityResponse = {
      accountDetails: { appLicensingVerdict: "LICENSED" },
      appIntegrity: {
        appRecognitionVerdict: "PLAY_RECOGNIZED",
        certificateSha256Digest: [
          "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w",
        ],
        packageName: "com.ioreactnativeintegrityexample",
        versionCode: "1",
      },
      deviceIntegrity: {
        deviceRecognitionVerdict: ["MEETS_DEVICE_INTEGRITY"],
      },
      requestDetails: {
        requestHash:
          "d2ac5449d0c7a781db49cb292c3a8cd2c57207cc62cb36160b1dc9a160c571b0",
        requestPackageName: "com.ioreactnativeintegrityexample",
        timestampMillis: new Date().getTime().toString(),
      },
    } as playintegrity_v1.Schema$TokenPayloadExternal;

    const responseValidated = validateIntegrityResponse(
      fakeTokenpayloadIntegrityResponse,
      bundleIdentifier,
      clientData,
      false,
      "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w",
    );

    expect(responseValidated).toEqual({ success: true });
  });

  it("should validate integrity response in development mode", () => {
    const fakeTokenpayloadIntegrityResponse = {
      accountDetails: { appLicensingVerdict: "UNLICENSED" },
      appIntegrity: {
        appRecognitionVerdict: "UNRECOGNIZED_VERSION",
        certificateSha256Digest: [
          "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w",
        ],
        packageName: "com.ioreactnativeintegrityexample",
        versionCode: "1",
      },
      deviceIntegrity: { deviceRecognitionVerdict: ["MEETS_DEVICE_INTEGRITY"] },
      requestDetails: {
        requestHash:
          "d2ac5449d0c7a781db49cb292c3a8cd2c57207cc62cb36160b1dc9a160c571b0",
        requestPackageName: "com.ioreactnativeintegrityexample",
        timestampMillis: new Date().getTime().toString(),
      },
    } as playintegrity_v1.Schema$TokenPayloadExternal;

    const responseValidated = validateIntegrityResponse(
      fakeTokenpayloadIntegrityResponse,
      bundleIdentifier,
      clientData,
      true,
      "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w",
    );

    expect(responseValidated).toEqual({ success: true });
  });
});
