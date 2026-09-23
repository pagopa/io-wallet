import { describe, expect, it } from "vitest";

import { areJwksEqual, JwkPublicKey } from "../jwk";

const publicRsaKey = {
  e: "AQAB",
  kid: "rsa#1",
  kty: "RSA",
  n: "s-rm_5nl9JIqpMVk97FXAFZ0O7Gej5Trnh8GNCSq3PUGWJGGevZ072J69HnnsFqh0f-h1_WaTX7su_9YX7Q8ktOe9ov8aNORMh9dAIsofFf_tPSflJY95gyLbX1QoZ3G7tv8ZspZKjLDuHZMv2R8WPNpnrF8UFNXN_IUcfBMI3kOXCgwaKUZhQ7A-DIcZWpfhT-CjGsDia_vtIFYK5PlFBOQtLCUlrZUES91gP-Dp_WO0lYLMiJZkOB1LzX_4Q1vqE9ihR4tsCsXWhWzxLr-OQSrbp8UMuTHlJSRBEBfWLBwdRE6mcaOJknabD0ROwI_Rkw4-6490tET1YJ7tBPN9w",
};

const publicEcKey = {
  crv: "P-256",
  kid: "rsa#1",
  kty: "EC" as const,
  x: "CakCjesDBwXeReRwLRzmhg6UwOKfM0NZpHYHjC0iucU",
  y: "a5cs0ywZzV6MGeBR8eIHyrs8KoAqv0DuW6qqSkZFCMM",
};

describe("JwkPublicKey", () => {
  it("should decode an ECKey with optional kid parameter", () => {
    const result = JwkPublicKey.decode({
      ...publicEcKey,
      kid: "KID#1",
    });

    expect(result).toEqual({
      _tag: "Right",
      right: {
        ...publicEcKey,
        kid: "KID#1",
      },
    });
  });

  it("should decode an RSAKey with optional kid parameter", () => {
    const result = JwkPublicKey.decode({
      ...publicRsaKey,
      kid: "KID#1",
    });

    expect(result).toEqual({
      _tag: "Right",
      right: {
        ...publicRsaKey,
        kid: "KID#1",
      },
    });
  });
});

describe("areJwksEqual", () => {
  it("should ignore kid differences when thumbprint matches", async () => {
    await expect(
      areJwksEqual(publicEcKey, {
        ...publicEcKey,
        kid: "another-kid",
      }),
    ).resolves.toBe(true);
  });

  it("should return false when the thumbprint changes", async () => {
    await expect(
      areJwksEqual(publicEcKey, {
        ...publicEcKey,
        x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
    ).resolves.toBe(false);
  });
});
