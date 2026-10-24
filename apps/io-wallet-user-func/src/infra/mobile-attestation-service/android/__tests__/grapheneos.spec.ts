import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createHash, createSign } from "crypto";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AndroidAssertionParams, validateAndroidAssertion } from "..";
import { GoogleAppCredentials } from "../assertion";
import { verifyAttestation } from "../attestation";
import {
  createAttestation,
  createTestRoot,
  GRAPHENEOS_BOOT_KEY,
  grapheneOsParams,
  PACKAGE_NAME,
  SIGNATURE_DIGEST,
  TestRoot,
} from "./key-attestation-chain";

vi.mock("@/certificates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/certificates")>()),
  getCrlFromUrl: () => TE.right({ entries: {} }),
}));

const trustedSelfSignedBootKeys = new Set([GRAPHENEOS_BOOT_KEY]);

describe("GrapheneOS key attestation", () => {
  let root: TestRoot;

  beforeAll(async () => {
    root = await createTestRoot();
  });

  const verify = async (
    x509Chain: Awaited<ReturnType<typeof createAttestation>>["x509Chain"],
    overrides: Partial<Parameters<typeof verifyAttestation>[0]> = {},
  ) =>
    verifyAttestation({
      attestationCrl: { entries: {} },
      attestKey: { requiredForSelfSigned: true },
      bundleIdentifiers: [PACKAGE_NAME],
      challenge: "challenge",
      googlePublicKeys: [root.publicKeyPem],
      signatureDigests: [SIGNATURE_DIGEST],
      trustedSelfSignedBootKeys,
      x509Chain,
      ...overrides,
    });

  it("should accept a locked device running GrapheneOS and pin its attest key", async () => {
    const { attestKey, x509Chain } = await createAttestation(
      root,
      grapheneOsParams(),
    );
    const result = await verify(x509Chain);
    expect(result).toMatchObject({
      deviceDetails: {
        attestKey: expect.objectContaining({ kty: "EC" }),
        platform: "android",
        verifiedBootKey: GRAPHENEOS_BOOT_KEY,
        verifiedBootState: 1,
      },
      success: true,
    });
    expect(attestKey).toBeDefined();
  });

  it("should accept the stock OS without app signing certificate digests", async () => {
    const { x509Chain } = await createAttestation(
      root,
      grapheneOsParams({
        verifiedBootKey: "12".repeat(32),
        verifiedBootState: 0,
      }),
      { attestKey: null },
    );
    const result = await verify(x509Chain, { signatureDigests: [] });
    expect(result.success).toBe(true);
  });

  it.each([
    [
      "a verified boot key not in the allowlist",
      grapheneOsParams({ verifiedBootKey: "34".repeat(32) }),
      {},
      "VerifiedBootKey of the self-signed OS is not allowed",
    ],
    [
      "missing app signing certificate digests",
      grapheneOsParams(),
      { signatureDigests: [] },
      "App signing certificate digests are required",
    ],
    [
      "a wrong app signing certificate",
      grapheneOsParams({ signatureDigests: ["cd".repeat(32)] }),
      {},
      "The app signing certificate does not match",
    ],
    [
      "an unlocked bootloader",
      grapheneOsParams({ deviceLocked: false }),
      {},
      "BootLoader unlocked",
    ],
    [
      "an unverified boot state",
      grapheneOsParams({ verifiedBootState: 2 }),
      {},
      "VerifiedBootState is not verified",
    ],
  ])("should reject %s", async (_, params, overrides, reason) => {
    const { x509Chain } = await createAttestation(root, params);
    const result = await verify(x509Chain, overrides);
    expect(result.success).toBe(false);
    expect(!result.success && result.reason).toContain(reason);
  });

  it("should require an attest key for GrapheneOS when configured", async () => {
    const { x509Chain } = await createAttestation(root, grapheneOsParams(), {
      attestKey: null,
    });
    const result = await verify(x509Chain);
    expect(!result.success && result.reason).toContain(
      "An attest key is required",
    );
    // Keys to attest (WSCD keys) don't have an attest key
    const keyToAttest = await verify(x509Chain, { attestKey: undefined });
    expect(keyToAttest.success).toBe(true);
  });

  it.each([
    [
      "a signing key appended as attest key",
      { purposes: [2] },
      "Attest key has invalid purposes",
    ],
    [
      "an attest key with another root of trust",
      { verifiedBootKey: "56".repeat(32) },
      "Attest key root of trust does not match",
    ],
    [
      "an attest key with another challenge",
      { challenge: "other" },
      "The attest key challenge does not match",
    ],
  ])("should reject %s", async (_, attestKeyParams, reason) => {
    const { x509Chain } = await createAttestation(root, grapheneOsParams(), {
      attestKeyParams,
    });
    const result = await verify(x509Chain);
    expect(!result.success && result.reason).toContain(reason);
  });
});

describe("Android assertion with key attestation fallback", () => {
  let root: TestRoot;

  beforeAll(async () => {
    root = await createTestRoot();
  });

  const clientData = JSON.stringify({ challenge: "assertion-challenge" });
  const requestHash = createHash("sha256").update(clientData).digest("hex");

  /**
   * Registers a device and prepares an assertion with a fresh key attestation.
   */
  const setup = async (freshAttestKey: "new" | "registered" = "registered") => {
    const registration = await createAttestation(root, grapheneOsParams());
    const verified = await verifyAttestation({
      attestationCrl: { entries: {} },
      attestKey: { requiredForSelfSigned: true },
      bundleIdentifiers: [PACKAGE_NAME],
      challenge: "challenge",
      googlePublicKeys: [root.publicKeyPem],
      signatureDigests: [SIGNATURE_DIGEST],
      trustedSelfSignedBootKeys,
      x509Chain: registration.x509Chain,
    });
    if (!verified.success) {
      throw new Error(verified.reason);
    }
    const fresh = await createAttestation(
      root,
      grapheneOsParams({ challenge: requestHash }),
      {
        attestKey:
          freshAttestKey === "registered" ? registration.attestKey : undefined,
      },
    );
    const hardwareSignature = createSign("SHA256")
      .update(clientData)
      .sign(registration.privateKey, "base64") as NonEmptyString;
    const params: AndroidAssertionParams = {
      allowDevelopmentEnvironment: false,
      androidPlayIntegrityUrl: "",
      androidPlayStoreCertificateHash: "",
      bundleIdentifiers: [PACKAGE_NAME],
      clientData,
      deviceDetails: verified.deviceDetails as AndroidDeviceDetails,
      googleAppCredentials: {} as GoogleAppCredentials,
      hardwareKey: verified.hardwareKey as JwkPublicKey,
      hardwareKeyAttestation: fresh.encoded as NonEmptyString,
      hardwareSignature,
      keyAttestationConfig: {
        androidCrlUrl: "",
        googlePublicKeys: [root.publicKeyPem],
        httpRequestTimeout: 1,
        signatureDigests: [SIGNATURE_DIGEST],
        trustedSelfSignedBootKeys,
      },
    };
    return params;
  };

  it("should accept a fresh key attestation signed by the registered attest key", async () => {
    const result = await validateAndroidAssertion(await setup())();
    expect(result).toEqual(E.right(undefined));
  });

  it("should reject a fresh key attestation relayed from another device", async () => {
    const result = await validateAndroidAssertion(await setup("new"))();
    expect(E.isLeft(result) && result.left.message).toContain(
      "The key has not been attested by the registered attest key",
    );
  });

  it("should reject an invalid hardware signature", async () => {
    const params = await setup();
    const result = await validateAndroidAssertion({
      ...params,
      clientData: "tampered",
    })();
    expect(E.isLeft(result) && result.left.message).toContain(
      "Invalid hardware signature",
    );
  });

  it("should reject when neither proof is provided", async () => {
    const params = await setup();
    const result = await validateAndroidAssertion({
      ...params,
      hardwareKeyAttestation: undefined,
    })();
    expect(E.isLeft(result) && result.left.message).toContain(
      "Play Integrity token not provided",
    );
  });
});
