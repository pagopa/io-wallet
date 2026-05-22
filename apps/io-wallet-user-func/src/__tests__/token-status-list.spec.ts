import * as E from "fp-ts/Either";
import * as jose from "jose";
import { describe, expect, it } from "vitest";
import { deflateSync } from "zlib";
import { z } from "zod";

import { CryptoSigner } from "@/infra/crypto/signer";
import { createTokenStatusList } from "@/token-status-list";

const tokenStatusListPayloadSchema = z.object({
  exp: z.number(),
  iat: z.number(),
  status_list: z.object({
    bits: z.number(),
    lst: z.string(),
  }),
  sub: z.string(),
});

const privateEcKey = {
  crv: "P-256",
  d: "vOTIOnH_rDol5cyaWL25DX4iGu_WU_l-AoTLmGIV_tg",
  kid: "ec#1",
  kty: "EC" as const,
  x: "CakCjesDBwXeReRwLRzmhg6UwOKfM0NZpHYHjC0iucU",
  y: "a5cs0ywZzV6MGeBR8eIHyrs8KoAqv0DuW6qqSkZFCMM",
};

const signer = new CryptoSigner({
  jwks: [privateEcKey],
  jwtDefaultAlg: "ES256",
  jwtDefaultDuration: "1h",
});

const certificateChain = ["leaf-certificate", "issuer-certificate"];

describe("status-list-jwt", () => {
  it("creates an OAuth status list JWT valid for exactly 24 hours", async () => {
    const bitString = Buffer.from([0xff, 0x00, 0x80, 0x01]);
    const statusListUrl = "https://cdn.example.com/statuslist/list-1";
    const jwtResult = await createTokenStatusList({
      bitString,
      kid: privateEcKey.kid,
      statusListCredentialUrl: statusListUrl,
      x5c: certificateChain,
    })(signer)();

    if (E.isLeft(jwtResult)) {
      throw jwtResult.left;
    }

    const protectedHeader = jose.decodeProtectedHeader(jwtResult.right);
    const payload = tokenStatusListPayloadSchema.parse(
      jose.decodeJwt(jwtResult.right),
    );
    const lst = deflateSync(bitString, { level: 9 }).toString("base64url");

    expect(protectedHeader.typ).toBe("statuslist+jwt");
    expect(protectedHeader.x5c).toEqual(certificateChain);
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
    expect(payload.sub).toBe(statusListUrl);
    expect(payload.status_list).toEqual({
      bits: 1,
      lst,
    });
  });
});
