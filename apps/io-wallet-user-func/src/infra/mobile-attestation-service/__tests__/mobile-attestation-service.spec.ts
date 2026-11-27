import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";
import { JwkPublicKey } from "io-wallet-common/jwk";
import * as jose from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AttestationServiceConfiguration } from "@/app/config";

import { MobileAttestationService } from "..";
import { validateAndroidAssertion } from "../android";

vi.mock("../android", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../android")>()),
  parseGoogleAppCredentials: vi.fn(() => E.right({})),
  validateAndroidAssertion: vi.fn(() => TE.right(undefined)),
}));

const configuration: AttestationServiceConfiguration = {
  allowedDeveloperUsers: [],
  androidBundleIdentifiers: ["it.pagopa.io.app"],
  androidCrlUrl: "https://example.com/crl",
  androidPlayIntegrityUrl: "https://example.com/play-integrity",
  androidPlayStoreCertificateHash: "hash",
  androidSigningCertificateDigests: ["7de4fe3e"],
  appleRootCertificate: "",
  googleAppCredentialsEncoded: "",
  googlePublicKeys: [],
  hardwarePublicTestKey: "",
  httpRequestTimeout: 1000,
  iosBundleIdentifiers: [],
  iOsTeamIdentifier: "",
};

const trustedSelfSignedBootKeys = new Set(["9e6a8f3e"]);

const deviceDetails: AndroidDeviceDetails = {
  attestationSecurityLevel: 2,
  attestationVersion: 300,
  keymasterSecurityLevel: 2,
  keymasterVersion: 300,
  platform: "android",
  verifiedBootKey: "9e6a8f3e",
  verifiedBootState: 1,
};

const toJwk = async () => {
  const { publicKey } = await jose.generateKeyPair("ES256");
  return JwkPublicKey.decode(await jose.exportJWK(publicKey));
};

describe("MobileAttestationService.validateAndroidAssertion", () => {
  beforeEach(() => {
    vi.mocked(validateAndroidAssertion).mockClear();
  });

  it("should forward the fresh key attestation and the registered device to the Android validation", async () => {
    const hardwareKey = await toJwk();
    const jwk = await toJwk();
    if (E.isLeft(hardwareKey) || E.isLeft(jwk)) {
      throw new Error("Invalid test JWK");
    }
    const service = new MobileAttestationService(
      configuration,
      () => trustedSelfSignedBootKeys,
    );

    const result = await service.validateAndroidAssertion({
      deviceDetails,
      hardwareKey: hardwareKey.right,
      hardwareKeyAttestation: "fresh-key-attestation" as NonEmptyString,
      hardwareSignature: "signature" as NonEmptyString,
      integrityAssertion: undefined,
      jwk: jwk.right,
      nonce: "nonce" as NonEmptyString,
      signCount: 0,
      user: "AAACCC94E17H501P" as FiscalCode,
    })();

    expect(result).toEqual(E.right(undefined));
    expect(validateAndroidAssertion).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceDetails,
        hardwareKeyAttestation: "fresh-key-attestation",
        integrityAssertion: undefined,
        keyAttestationConfig: expect.objectContaining({
          signatureDigests: ["7de4fe3e"],
          trustedSelfSignedBootKeys,
        }),
      }),
    );
  });
});
