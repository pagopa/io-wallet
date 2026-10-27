/* eslint-disable vitest/no-conditional-expect */
import { createSign, generateKeyPairSync } from "crypto";
import * as E from "fp-ts/lib/Either";
import { playintegrity_v1 } from "googleapis";
import { ECPublicKey } from "io-wallet-common/jwk";
import { exportJWK } from "jose";
import { describe, expect, it, vi } from "vitest";

import { emitTelemetryCustomEvent } from "@/infra/telemetry";

import {
  GoogleAppCredentials,
  validateAssertionSignature,
  validateIntegrityResponse,
  verifyAssertion,
} from "../assertion";
import { androidMockData } from "./config";

vi.mock("@/infra/telemetry", () => ({
  emitTelemetryCustomEvent: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: vi.fn(function () {
        return { authorize: vi.fn().mockResolvedValue(undefined) };
      }),
    },
    playintegrity: vi.fn(() => ({
      v1: {
        decodeIntegrityToken: vi.fn().mockResolvedValue({
          data: { tokenPayloadExternal: {} },
        }),
      },
    })),
  },
}));

describe("AndroidAssertionValidation", async () => {
  const { bundleIdentifier, challenge, ephemeralKey } = androidMockData;

  const hardwareKeyPair = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const hardwareKey = await exportJWK(hardwareKeyPair.publicKey);

  const clientData = JSON.stringify({ challenge, jwk: ephemeralKey });
  const signer = createSign("SHA256");
  signer.update(clientData);
  const hardwareSignature = signer.sign(hardwareKeyPair.privateKey, "base64");

  it("should fail assertion verification for an invalid integrity payload", async () => {
    vi.mocked(emitTelemetryCustomEvent).mockClear();

    const googleAppCredentials = E.getOrElseW(() => {
      throw new Error("Invalid test Google credentials");
    })(
      GoogleAppCredentials.decode({
        auth_provider_x509_cert_url: "https://example.com/certs",
        auth_uri: "https://example.com/auth",
        client_email: "test@example.com",
        client_id: "client-id",
        client_x509_cert_url: "https://example.com/client-certs",
        private_key: "private-key",
        private_key_id: "private-key-id",
        project_id: "project-id",
        token_uri: "https://example.com/token",
        type: "service_account",
        universe_domain: "googleapis.com",
      }),
    );
    const decodedHardwareKey = E.getOrElseW(() => {
      throw new Error("Invalid test hardware key");
    })(ECPublicKey.decode(hardwareKey));

    await expect(
      verifyAssertion({
        allowDevelopmentEnvironment: false,
        androidPlayIntegrityUrl: "https://playintegrity.googleapis.com",
        androidPlayStoreCertificateHash: "certificate-hash",
        bundleIdentifiers: [bundleIdentifier],
        clientData,
        googleAppCredentials,
        hardwareKey: decodedHardwareKey,
        hardwareSignature,
        integrityAssertion: androidMockData.integrityAssertion,
      }),
    ).resolves.toEqual({
      reason:
        "Integrity Response did not pass validation: Invalid requestDetails",
      success: false,
    });

    expect(emitTelemetryCustomEvent).toHaveBeenCalledExactlyOnceWith({
      name: "ANDROID_INTEGRITY_CHECK_FAILED",
    });
  });

  it("should validate assertion signature", async () => {
    const eCPublicKeyDecoded = ECPublicKey.decode(hardwareKey);

    expect.assertions(1);

    if (E.isRight(eCPublicKeyDecoded)) {
      const signatureValidated = validateAssertionSignature(
        eCPublicKeyDecoded.right,
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
