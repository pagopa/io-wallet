import { it, expect, describe } from "vitest";

import * as jose from "jose";

import { CryptoSigner } from "../signer";

describe("CryptoSigner", async () => {
  const joseRsaKeys = await jose.generateKeyPair("PS256");
  const joseEcKeys = await jose.generateKeyPair("ES256");

  const privateRsaKey = await jose.exportJWK(joseRsaKeys.privateKey);
  const privateEcKey = await jose.exportJWK(joseEcKeys.privateKey);

  const publicRsaKey = await jose.exportJWK(joseRsaKeys.publicKey);
  const publicEcKey = await jose.exportJWK(joseEcKeys.publicKey);

  const jwks = [privateEcKey, privateRsaKey];
  const publicJwks = [publicEcKey, publicRsaKey];

  const signer = new CryptoSigner({ jwks });

  it("should return a jwks of only public keys", () => {
    const run = signer.getPublicKeys();
    expect(run).toEqual(
      expect.objectContaining({
        right: expect.objectContaining(publicJwks),
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
