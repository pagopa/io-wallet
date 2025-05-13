import { ECKey, ECPrivateKey, JwkPrivateKey, JwkPublicKey } from "./jwk";
import { importJWK, CompactSign, JWK } from "jose";
import { type SignCallback } from "@openid-federation/core";

export interface JwksRepository {
  readonly get: () => JwkKeyPair<"EC">;
}

interface JwkKeyPair<A> {
  readonly private: JwkPrivateKey &
    Required<Pick<ECPrivateKey, "kid">> & { readonly kty: A };
  readonly public: JwkPublicKey &
    Required<Pick<ECKey, "kid">> & { readonly kty: A };
}

/**
 * Converts a base64url-encoded string into a standard base64-encoded string.
 *
 * @param base64url - The base64url-encoded input string
 * @returns The base64-encoded output string
 */
const base64urlToBase64 = (base64url: string): string =>
  base64url.replace(/-/g, "+").replace(/_/g, "/") +
  "=".repeat((4 - (base64url.length % 4)) % 4);

/**
 * Signs the given payload using the provided JWK and returns the raw signature bytes.
 *
 * @param toBeSigned - The payload to sign (typically the header and payload of a JWT)
 * @param jwk - The JSON Web Key to use for signing
 * @returns A Buffer containing the raw signature bytes
 */
export const signJwtCallback: SignCallback = async ({ toBeSigned, jwk }) => {
  const alg = jwk.alg ?? "ES256";
  const key = await importJWK(jwk as unknown as JWK, alg);

  // sign with JWS compact format.
  const jws = await new CompactSign(toBeSigned)
    .setProtectedHeader({ alg: alg })
    .sign(key);

  // JWS compact format is "header.payload.signature"
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("JWS compact format is not valid");
  }
  const signatureBase64Url = parts[2];

  const signatureBase64 = base64urlToBase64(signatureBase64Url);
  const signatureBytes = Buffer.from(signatureBase64, "base64");

  return signatureBytes;
};
