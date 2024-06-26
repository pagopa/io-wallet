import * as E from "fp-ts/lib/Either";
import { describe, expect, it } from "vitest";

import { getPublicKeyFromCnf } from "../verifier";

const mockWalletAttestationRequest =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6InZiZVhKa3NNNDV4cGh0QU5uQ2lHNm1DeXVVNGpmR056b3BHdUt2b2dnOWMiLCJ0eXAiOiJ2YXIrand0In0.eyJpc3MiOiJ2YmVYSmtzTTQ1eHBodEFObkNpRzZtQ3l1VTRqZkdOem9wR3VLdm9nZzljIiwic3ViIjoiaHR0cHM6Ly93YWxsZXQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvIiwianRpIjoiNWZmOWI2M2YtMTgzYS00Y2ZkLWE0ZGMtYjI4ZjNlNTgxNzU0IiwidHlwZSI6IldhbGxldEluc3RhbmNlQXR0ZXN0YXRpb25SZXF1ZXN0IiwiY25mIjp7Imp3ayI6eyJjcnYiOiJQLTI1NiIsImt0eSI6IkVDIiwieCI6IjRITnB0SS14cjJwanlSSktHTW56NFdtZG5RRF91SlNxNFI5NU5qOThiNDQiLCJ5IjoiTElablNCMzl2RkpoWWdTM2s3alhFNHIzLUNvR0ZRd1p0UEJJUnFwTmxyZyIsImtpZCI6InZiZVhKa3NNNDV4cGh0QU5uQ2lHNm1DeXVVNGpmR056b3BHdUt2b2dnOWMifX0sImlhdCI6MTY4ODcxNDkxNiwiZXhwIjoxNjg4NzIyMTE2fQ.VOCEzt1bYYYPs-jFxlCnLXqygAZhn3p0J9lxR_1rVXVJAYPlhmqg5zwP8CRKouJ-A66lkhcF-L3HdGdxuJ839Q";

const publicKey = {
  crv: "P-256",
  kid: "vbeXJksM45xphtANnCiG6mCyuU4jfGNzopGuKvogg9c",
  kty: "EC",
  x: "4HNptI-xr2pjyRJKGMnz4WmdnQD_uJSq4R95Nj98b44",
  y: "LIZnSB39vFJhYgS3k7jXE4r3-CoGFQwZtPBIRqpNlrg",
};

describe("getPublicKeyFromCnf", () => {
  it("should return public key from custom jwt", () => {
    const result = getPublicKeyFromCnf(mockWalletAttestationRequest);

    expect(result).toEqual({
      _tag: "Right",
      right: publicKey,
    });
  });

  it("must not find any keys", () => {
    const result = getPublicKeyFromCnf("");

    expect(E.isRight(result)).toBe(false);
  });
});
