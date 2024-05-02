import { it, expect, describe } from "vitest";
import { androidMockData } from "./config";
import {
  validateAssertionSignature,
  validateIntegrityResponse,
} from "../assertion";
import { generateKeyPairSync, createSign, createHash } from "crypto";
import { exportJWK } from "jose";
import { playintegrity_v1 } from "googleapis";

describe("AndroidAssertionValidation", async () => {
  const { challenge, bundleIdentifier, ephemeralKey } = androidMockData;

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
    const signatureValidated = await validateAssertionSignature(
      hardwareKey,
      clientData,
      hardwareSignature
    );

    expect(signatureValidated).toEqual(true);
  });

  it("should validate integrity response", () => {
    const fakeTokenpayloadIntegrityResponse = {
      requestDetails: {
        requestPackageName: "com.ioreactnativeintegrityexample",
        timestampMillis: new Date().getTime().toString(),
        requestHash:
          "d2ac5449d0c7a781db49cb292c3a8cd2c57207cc62cb36160b1dc9a160c571b0",
      },
      appIntegrity: {
        appRecognitionVerdict: "PLAY_RECOGNIZED",
        packageName: "com.ioreactnativeintegrityexample",
        certificateSha256Digest: [
          "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w",
        ],
        versionCode: "1",
      },
      deviceIntegrity: {
        deviceRecognitionVerdict: ["MEETS_DEVICE_INTEGRITY"],
      },
      accountDetails: { appLicensingVerdict: "LICENSED" },
    } as playintegrity_v1.Schema$TokenPayloadExternal;

    const responseValidated = validateIntegrityResponse(
      fakeTokenpayloadIntegrityResponse,
      bundleIdentifier,
      clientData,
      false,
      "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w"
    );

    expect(responseValidated).toEqual(true);
  });

  it("should validate integrity response in development mode", () => {
    const fakeTokenpayloadIntegrityResponse = {
      requestDetails: {
        requestPackageName: "com.ioreactnativeintegrityexample",
        timestampMillis: new Date().getTime().toString(),
        requestHash:
          "d2ac5449d0c7a781db49cb292c3a8cd2c57207cc62cb36160b1dc9a160c571b0",
      },
      appIntegrity: {
        appRecognitionVerdict: "UNRECOGNIZED_VERSION",
        packageName: "com.ioreactnativeintegrityexample",
        certificateSha256Digest: [
          "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w",
        ],
        versionCode: "1",
      },
      deviceIntegrity: { deviceRecognitionVerdict: ["MEETS_DEVICE_INTEGRITY"] },
      accountDetails: { appLicensingVerdict: "UNLICENSED" },
    } as playintegrity_v1.Schema$TokenPayloadExternal;

    const responseValidated = validateIntegrityResponse(
      fakeTokenpayloadIntegrityResponse,
      bundleIdentifier,
      clientData,
      true,
      "-sYXRdwJA3hvue3mKpYrOZ9zSPC7b4mbgzJmdZEDO5w"
    );

    expect(responseValidated).toEqual(true);
  });
});
