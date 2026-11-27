/* eslint-disable vitest/no-conditional-expect */
import { createHash, createSign, generateKeyPairSync } from "crypto";
import * as E from "fp-ts/lib/Either";
import { playintegrity_v1 } from "googleapis";
import { ECPublicKey } from "io-wallet-common/jwk";
import { exportJWK } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { emitTelemetryCustomEvent } from "@/infra/telemetry";

import {
  ExternalServiceError,
  GoogleAppCredentials,
  validateAssertionSignature,
  validateIntegrityResponse,
  verifyAssertion,
} from "../assertion";
import { androidMockData } from "./config";

const { decodeIntegrityToken } = vi.hoisted(() => ({
  decodeIntegrityToken: vi.fn(),
}));

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
        decodeIntegrityToken,
      },
    })),
  },
}));

beforeEach(() => {
  decodeIntegrityToken.mockReset().mockResolvedValue({
    data: { tokenPayloadExternal: {} },
  });
});

describe("AndroidAssertionValidation", async () => {
  const { bundleIdentifier, challenge, ephemeralKey } = androidMockData;

  const hardwareKeyPair = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const hardwareKey = await exportJWK(hardwareKeyPair.publicKey);

  const decodedHardwareKey = E.getOrElseW(() => {
    throw new Error("Invalid test hardware key");
  })(ECPublicKey.decode(hardwareKey));

  const clientData = JSON.stringify({ challenge, jwk: ephemeralKey });
  const signer = createSign("SHA256");
  signer.update(clientData);
  const hardwareSignature = signer.sign(hardwareKeyPair.privateKey, "base64");

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

  it("should fail assertion verification for an invalid integrity payload", async () => {
    vi.mocked(emitTelemetryCustomEvent).mockClear();

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

  const pocPackage = "it.pagopa.app.io.poc.itwallet";

  const params = {
    allowDevelopmentEnvironment: false,
    androidPlayIntegrityUrl: "https://playintegrity.googleapis.com",
    androidPlayStoreCertificateHash: "certificate-hash",
    bundleIdentifiers: ["it.pagopa.io.app", pocPackage],
    clientData,
    googleAppCredentials,
    hardwareKey: decodedHardwareKey,
    hardwareSignature,
    integrityAssertion: androidMockData.integrityAssertion,
  };

  it("should try the POC package when decoding fails for the first package", async () => {
    decodeIntegrityToken
      .mockRejectedValueOnce(new Error("Package name mismatch"))
      .mockResolvedValueOnce({
        data: {
          tokenPayloadExternal: {
            accountDetails: { appLicensingVerdict: "LICENSED" },
            appIntegrity: {
              appRecognitionVerdict: "PLAY_RECOGNIZED",
              certificateSha256Digest: ["certificate-hash"],
              packageName: pocPackage,
            },
            deviceIntegrity: {
              deviceRecognitionVerdict: ["MEETS_DEVICE_INTEGRITY"],
            },
            requestDetails: {
              requestHash: createHash("sha256")
                .update(clientData)
                .digest("hex"),
              requestPackageName: pocPackage,
              timestampMillis: Date.now().toString(),
            },
          },
        },
      });

    await expect(verifyAssertion(params)).resolves.toEqual({ success: true });
    expect(decodeIntegrityToken).toHaveBeenCalledTimes(2);
  });

  it("should fail when decoding fails for every package", async () => {
    decodeIntegrityToken.mockRejectedValue(new Error("Package name mismatch"));

    await expect(verifyAssertion(params)).rejects.toBeInstanceOf(
      ExternalServiceError,
    );
    expect(decodeIntegrityToken).toHaveBeenCalledTimes(2);
  });
});
