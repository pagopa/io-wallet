// signJwtCallback.spec.ts
import { CompactSign } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { signJwtCallback } from "../domain/signer";

const ecPrivateJwk = {
  alg: "ES256",
  crv: "P-256",
  d: "NnStqDr1IRNBm3Adxpv8uKXu95I2xqB6fFWYdCUjxNg",
  kid: "kzouDFz7NlhG_cW00MX_e5bfmGmMRCH4UOxzy16TqJY",
  kty: "EC",
  x: "3KZRbvgZTDt6NgAbg8zHJtjQS6FHD6WeOEC7YbI-Z54",
  y: "5NSHUaYbU25tXq7mJpCoXUFmiN5bKueO_6PMsQ4rpSI",
} as const;

/** Helper mirroring the private base64url→base64 converter in the module. */

describe("signJwtCallback", () => {
  const payload = new TextEncoder().encode("unit-test");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the raw ES256 signature bytes", async () => {
    // Build the expected signature the same way José does internally
    const actualBytes = await signJwtCallback({
      jwk: ecPrivateJwk,
      toBeSigned: payload,
    });

    expect(actualBytes).toHaveLength(64);
  });

  it("throws when CompactSign does not produce a 3-part JWS", async () => {
    // Monkey-patch CompactSign#sign to return something malformed
    vi.spyOn(CompactSign.prototype, "sign").mockResolvedValue("invalidJws");

    await expect(
      signJwtCallback({
        jwk: ecPrivateJwk,
        toBeSigned: payload,
      }),
    ).rejects.toThrow("JWS compact format is not valid");
  });
});
