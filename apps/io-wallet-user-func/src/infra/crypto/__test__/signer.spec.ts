import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { ECPrivateKey, Jwk, RSAKey, RSAPrivateKey } from "io-wallet-common/jwk";
import * as jose from "jose";
import { describe, expect, it } from "vitest";

import { CryptoSigner } from "../signer";

const publicRsaKey = {
  e: "AQAB",
  kid: "rsa#1",
  kty: "RSA",
  n: "s-rm_5nl9JIqpMVk97FXAFZ0O7Gej5Trnh8GNCSq3PUGWJGGevZ072J69HnnsFqh0f-h1_WaTX7su_9YX7Q8ktOe9ov8aNORMh9dAIsofFf_tPSflJY95gyLbX1QoZ3G7tv8ZspZKjLDuHZMv2R8WPNpnrF8UFNXN_IUcfBMI3kOXCgwaKUZhQ7A-DIcZWpfhT-CjGsDia_vtIFYK5PlFBOQtLCUlrZUES91gP-Dp_WO0lYLMiJZkOB1LzX_4Q1vqE9ihR4tsCsXWhWzxLr-OQSrbp8UMuTHlJSRBEBfWLBwdRE6mcaOJknabD0ROwI_Rkw4-6490tET1YJ7tBPN9w",
} as RSAKey;

const privateRsaKey = {
  ...publicRsaKey,
  d: "BfDXt9DpGu5IojAyaUtdyBESvXXb-nm8XfhASDB9w9YDY6FKg3zn14-056Wu1M_pT_nU6kCd27k5L-v6iw50gZSjRxjQONXjkXgfpgjySUjOlLcPHeToHlSDthXRN8Tx8Kkq6Gn-D7qlY83kMt2qjXVcI3VQ2YYm9x3zNt_sY69papRwOsA-jhEX-nOiENFWYQI0wdy7DRiZvMwv3TBV68pBp5OKpskqwiB-xo-E2s3YdXE7ngmSt6P4kDaDkCM29dd61_4eREbCZVVmAkcfmcgJQFOX5uboQDHr1KQJ9S0vSDqfUbAJNjN22FrPmsuULe5hkPoIFkoLUjKPJ6tpAQ",
  dp: "paS7gPmk_7cGjlzy_MBMY9V7W4g3AzX8zi9ezAajICpeEdYBLn2yM4uL6CyOdqa_fZVoQ1zvDX6cYHpmEFRcbulBPWOkqeApCy07R1M0qLFAWk-uLh1k2my2C5d7PAEBVSChnmQc8D_A37XH_gyndQfKhiHOrytYdPgB3lc6QGE",
  dq: "zNnMobhozaF0hzdVpaNF4aV0OvEUbLCuLMipOd0MK4tHK-kUdA1EOBLk6yqkyAk3422oodU-2oP5A7dH2FYwYB4CVc4ad8F9fixNoOZ2KTWeByrYkwVfdHmVcUgd5KYK_qFrn2vJJBBaz-l3a-DXfaF1aKgj9cCKsq-UyVi_VrU",
  p: "yZySezXtzBKcJnN9kROlUy_ZXHTf_GkScW5W-VFA0gSVl9ANVWqv3uYUy1tbzHfb2WYNXQ3GgxE-WXZVo7W4mFuNG8i5yifdeuDie48wFKSj0KpcjrSm_gPt6m6NjgAcZ0FwLNUlQJnlNhMjxqVpjPgBeTb1uI0bwypBl9sIXuE",
  q: "5HQgfuBS1IIa0e-xpNGaji95V0vkWqrUha4KlocEoQFGb-wRPQD8Vn55q62mJpZ3BA7dI5TWx6-U1arKJXAW9XWjb_dtleGdvRzzamgKdB6YVUgunsAoHtjLFXuwJPVO5RJHrECvJ-axpkMiwpYqkA6UoJ0FDYPrEbR-uAzK_9c",
  qi: "r3FVQGWOMqNykr8wfkFlYFDWW06J8-jBr4sAmRQbu52esUmg6cE36EkiN6RvZSvSBUquPBsqM3rU1e3SBEL-2tImlMRMfXFSE6c4-ScnFNN7rhcYURBwokej9-Kq83Ll-sr60I-fJz9riMLVMC4A7jfeikj7intD0z-omczcQA",
} as RSAPrivateKey;

const publicEcKey = {
  crv: "P-256",
  kid: "ec#1",
  kty: "EC",
  x: "CakCjesDBwXeReRwLRzmhg6UwOKfM0NZpHYHjC0iucU",
  y: "a5cs0ywZzV6MGeBR8eIHyrs8KoAqv0DuW6qqSkZFCMM",
};

const privateEcKey = {
  ...publicEcKey,
  d: "vOTIOnH_rDol5cyaWL25DX4iGu_WU_l-AoTLmGIV_tg",
} as ECPrivateKey;

describe("CryptoSigner", () => {
  const jwks = [privateEcKey, privateRsaKey];
  const publicJwks = [publicEcKey, publicRsaKey];

  const signer = new CryptoSigner({
    jwks,
    jwtDefaultAlg: "ES256",
    jwtDefaultDuration: "1h",
  });

  it("should return first jwk with EC kty", () => {
    const result = signer.getFirstPublicKeyByKty("EC");

    expect(result).toEqual({
      _tag: "Right",
      right: publicEcKey,
    });
  });

  it("should return a jwks of only public keys", () => {
    const result = signer.getPublicKeys();

    expect(result).toEqual({
      _tag: "Right",
      right: publicJwks,
    });
  });

  it("shouldn't return a jwks", () => {
    const jwks = [{ thisIsNotAKey: "00" } as unknown as Jwk];
    const signer = new CryptoSigner({
      jwks,
      jwtDefaultAlg: "ES256",
      jwtDefaultDuration: "1h",
    });
    const result = signer.getPublicKeys();

    expect(E.isLeft(result)).toBe(true);
  });

  it("should return supported sign algorithms", () => {
    const result = signer.getSupportedSignAlgorithms();

    expect(result).toEqual({
      _tag: "Right",
      right: ["ES256"],
    });
  });

  it("should create and sign a JWT", async () => {
    const result = await signer.createJwtAndSign(
      { typ: "demo" },
      publicEcKey.kid,
    )({
      iss: "Issuer of JWT",
      sub: "Subject of JWT",
    })();

    expect.assertions(2);
    expect(E.isRight(result)).toBe(true);

    if (E.isRight(result)) {
      const verification = await pipe(
        TE.tryCatch(() => jose.importJWK(publicEcKey), E.toError),
        TE.chain((joseKey) =>
          TE.tryCatch(() => jose.jwtVerify(result.right, joseKey), E.toError),
        ),
      )();
      expect(E.isRight(verification)).toBe(true);
    }
  });

  it("should fail to create and sign a JWT", async () => {
    const signerWithOnlyRsa = new CryptoSigner({
      jwks: [privateRsaKey],
      jwtDefaultAlg: "ES256",
      jwtDefaultDuration: "1h",
    });
    const createJwtAndsign = signerWithOnlyRsa.createJwtAndSign(
      { typ: "demo" },
      publicEcKey.kid,
    )({
      iss: "Issuer of JWT",
      sub: "Subject of JWT",
    });

    await expect(createJwtAndsign()).resolves.toEqual({
      _tag: "Left",
      left: expect.any(Error),
    });
  });
});
