import { it, expect, describe } from "vitest";
import * as jose from "jose";
import * as E from "fp-ts/lib/Either";

import { JwkPrivateKey, JwkPublicKey, fromBase64ToJwks } from "../jwk";

describe("JwkPublicKey", async () => {
  const publicJoseRsaKey = (await jose.generateKeyPair("PS256")).publicKey;
  const publicJoseEcKey = (await jose.generateKeyPair("ES256")).publicKey;

  const publicRsaKey = await jose.exportJWK(publicJoseRsaKey);
  const publicEcKey = await jose.exportJWK(publicJoseEcKey);

  it("should decode an ECKey with optional kid parameter", () => {
    const result = JwkPublicKey.decode({
      ...publicEcKey,
      kid: "KID#1",
    });
    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      expect(result.right).toStrictEqual({
        ...publicEcKey,
        kid: "KID#1",
      });
    }
  });

  it("should decode an RSAKey with optional kid parameter", () => {
    const result = JwkPublicKey.decode({
      ...publicRsaKey,
      kid: "KID#1",
    });
    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      expect(result.right).toStrictEqual({
        ...publicRsaKey,
        kid: "KID#1",
      });
    }
  });
});

describe("JwkPrivateKey", async () => {
  const privateJoseRsaKey = (await jose.generateKeyPair("PS256")).privateKey;
  const privateJoseEcKey = (await jose.generateKeyPair("ES256")).privateKey;

  const privateRsaKey = await jose.exportJWK(privateJoseRsaKey);
  const privateEcKey = await jose.exportJWK(privateJoseEcKey);

  it("should decode an ECKey with optional kid parameter", () => {
    const result = JwkPublicKey.decode({
      ...privateEcKey,
      kid: "KID#1",
    });
    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      expect(result.right).toStrictEqual({
        ...privateEcKey,
        kid: "KID#1",
      });
    }
  });

  it("should decode an RSAKey with optional kid parameter", () => {
    const result = JwkPublicKey.decode({
      ...privateRsaKey,
      kid: "KID#1",
    });
    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      expect(result.right).toStrictEqual({
        ...privateRsaKey,
        kid: "KID#1",
      });
    }
  });
});

describe("fromBase64ToJwks", async () => {
  const privateJoseRsaKey = (await jose.generateKeyPair("PS256")).privateKey;
  const privateJoseEcKey = (await jose.generateKeyPair("ES256")).privateKey;

  const privateRsaKey = await jose.exportJWK(privateJoseRsaKey);
  const privateEcKey = await jose.exportJWK(privateJoseEcKey);

  const jwks = [privateRsaKey, privateEcKey];
  console.log(jwks);

  it("should return JWKs form base64 representation", () => {
    const stringJwks = JSON.stringify(jwks);
    const b64 = Buffer.from(stringJwks, "utf-8").toString("base64");

    const result = fromBase64ToJwks(b64);
    console.log(result);
    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      expect(result.right).toStrictEqual(jwks);
    }
  });
});
