import { it, expect, describe } from "vitest";

import * as jose from "jose";

import { CryptoSigner } from "../signer";

describe("CryptoSigner", async () => {
  const publicJoseRsaKey = (await jose.generateKeyPair("PS256")).publicKey;
  const publicJoseEcKey = (await jose.generateKeyPair("ES256")).publicKey;

  const publicRsaKey = await jose.exportJWK(publicJoseRsaKey);
  const publicEcKey = await jose.exportJWK(publicJoseEcKey);

  const jwks = [publicRsaKey, publicEcKey];
  const signer = new CryptoSigner({ jwks });

  it("should return a jwks", () => {
    const run = signer.getPublicKeys();
    expect(run).toEqual(
      expect.objectContaining({
        right: expect.objectContaining(jwks),
      })
    );
  });

  it("shouldn't return a jwks", () => {
    const jwks = [{ thisIsNotAKey: "00" }];
    const signer = new CryptoSigner({ jwks });

    const run = signer.getPublicKeys();

    expect(run).toEqual(
      expect.objectContaining({
        _tag: "Left",
      })
    );
  });

  it("should return supported sign algorithms", () => {
    const run = signer.getSupportedSignAlgorithms();
    expect(run).toEqual(
      expect.objectContaining({
        right: expect.objectContaining([
          "ES256",
          "ES256K",
          "ES384",
          "ES512",
          "RS256",
          "RS384",
          "RS512",
          "PS256",
          "PS384",
          "PS512",
        ]),
      })
    );
  });
});
