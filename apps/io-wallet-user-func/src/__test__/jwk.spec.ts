import { it, expect, describe } from "vitest";

import {
  JwkPrivateKey,
  JwkPublicKey,
  fromBase64ToJwks,
  validateJwkKid,
} from "io-wallet-common/jwk";

const publicRsaKey = {
  kty: "RSA",
  n: "s-rm_5nl9JIqpMVk97FXAFZ0O7Gej5Trnh8GNCSq3PUGWJGGevZ072J69HnnsFqh0f-h1_WaTX7su_9YX7Q8ktOe9ov8aNORMh9dAIsofFf_tPSflJY95gyLbX1QoZ3G7tv8ZspZKjLDuHZMv2R8WPNpnrF8UFNXN_IUcfBMI3kOXCgwaKUZhQ7A-DIcZWpfhT-CjGsDia_vtIFYK5PlFBOQtLCUlrZUES91gP-Dp_WO0lYLMiJZkOB1LzX_4Q1vqE9ihR4tsCsXWhWzxLr-OQSrbp8UMuTHlJSRBEBfWLBwdRE6mcaOJknabD0ROwI_Rkw4-6490tET1YJ7tBPN9w",
  e: "AQAB",
  kid: "rsa#1",
};

const privateRsaKey = {
  ...publicRsaKey,
  d: "BfDXt9DpGu5IojAyaUtdyBESvXXb-nm8XfhASDB9w9YDY6FKg3zn14-056Wu1M_pT_nU6kCd27k5L-v6iw50gZSjRxjQONXjkXgfpgjySUjOlLcPHeToHlSDthXRN8Tx8Kkq6Gn-D7qlY83kMt2qjXVcI3VQ2YYm9x3zNt_sY69papRwOsA-jhEX-nOiENFWYQI0wdy7DRiZvMwv3TBV68pBp5OKpskqwiB-xo-E2s3YdXE7ngmSt6P4kDaDkCM29dd61_4eREbCZVVmAkcfmcgJQFOX5uboQDHr1KQJ9S0vSDqfUbAJNjN22FrPmsuULe5hkPoIFkoLUjKPJ6tpAQ",
  p: "yZySezXtzBKcJnN9kROlUy_ZXHTf_GkScW5W-VFA0gSVl9ANVWqv3uYUy1tbzHfb2WYNXQ3GgxE-WXZVo7W4mFuNG8i5yifdeuDie48wFKSj0KpcjrSm_gPt6m6NjgAcZ0FwLNUlQJnlNhMjxqVpjPgBeTb1uI0bwypBl9sIXuE",
  q: "5HQgfuBS1IIa0e-xpNGaji95V0vkWqrUha4KlocEoQFGb-wRPQD8Vn55q62mJpZ3BA7dI5TWx6-U1arKJXAW9XWjb_dtleGdvRzzamgKdB6YVUgunsAoHtjLFXuwJPVO5RJHrECvJ-axpkMiwpYqkA6UoJ0FDYPrEbR-uAzK_9c",
  dp: "paS7gPmk_7cGjlzy_MBMY9V7W4g3AzX8zi9ezAajICpeEdYBLn2yM4uL6CyOdqa_fZVoQ1zvDX6cYHpmEFRcbulBPWOkqeApCy07R1M0qLFAWk-uLh1k2my2C5d7PAEBVSChnmQc8D_A37XH_gyndQfKhiHOrytYdPgB3lc6QGE",
  dq: "zNnMobhozaF0hzdVpaNF4aV0OvEUbLCuLMipOd0MK4tHK-kUdA1EOBLk6yqkyAk3422oodU-2oP5A7dH2FYwYB4CVc4ad8F9fixNoOZ2KTWeByrYkwVfdHmVcUgd5KYK_qFrn2vJJBBaz-l3a-DXfaF1aKgj9cCKsq-UyVi_VrU",
  qi: "r3FVQGWOMqNykr8wfkFlYFDWW06J8-jBr4sAmRQbu52esUmg6cE36EkiN6RvZSvSBUquPBsqM3rU1e3SBEL-2tImlMRMfXFSE6c4-ScnFNN7rhcYURBwokej9-Kq83Ll-sr60I-fJz9riMLVMC4A7jfeikj7intD0z-omczcQA",
};

const publicEcKey = {
  kty: "EC" as const,
  x: "CakCjesDBwXeReRwLRzmhg6UwOKfM0NZpHYHjC0iucU",
  y: "a5cs0ywZzV6MGeBR8eIHyrs8KoAqv0DuW6qqSkZFCMM",
  crv: "P-256",
  kid: "rsa#1",
};

const privateEcKey = {
  ...publicEcKey,
  d: "vOTIOnH_rDol5cyaWL25DX4iGu_WU_l-AoTLmGIV_tg",
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

describe("JwkPrivateKey", () => {
  it("should decode an ECKey with optional kid parameter", () => {
    const result = JwkPrivateKey.decode({
      ...privateEcKey,
      kid: "KID#1",
    });

    expect(result).toEqual({
      _tag: "Right",
      right: {
        ...privateEcKey,
        kid: "KID#1",
      },
    });
  });

  it("should decode an RSAKey with optional kid parameter", () => {
    const result = JwkPrivateKey.decode({
      ...privateRsaKey,
      kid: "KID#1",
    });

    expect(result).toEqual({
      _tag: "Right",
      right: {
        ...privateRsaKey,
        kid: "KID#1",
      },
    });
  });
});

describe("fromBase64ToJwks", () => {
  const jwks = [privateRsaKey, privateEcKey];

  it("should return JWKs form base64 representation", () => {
    const stringJwks = JSON.stringify(jwks);
    const b64 = Buffer.from(stringJwks, "utf-8").toString("base64");
    const result = fromBase64ToJwks(b64);

    expect(result).toEqual({
      _tag: "Right",
      right: jwks,
    });
  });
});

describe("validateJwkKid", () => {
  it("should return JWK when kid is a string", () => {
    const result = validateJwkKid(publicEcKey);
    expect(result).toEqual({
      _tag: "Right",
      right: publicEcKey,
    });
  });

  it("should return a error when kid is undefined", () => {
    const result = validateJwkKid({ ...publicEcKey, kid: undefined });
    expect(result).toEqual({
      _tag: "Left",
      left: expect.any(Error),
    });
  });
});
