import * as crypto from "node:crypto";
import { decodeBase64, encodeToUtf8String } from "@openid4vc/utils";
import * as jose from "jose";
import {
  type CallbackContext,
  type Jwk,
  HashAlgorithm,
  type SignJwtCallback,
  calculateJwkThumbprint,
} from "@openid4vc/oauth2";
import { clientAuthenticationNone } from "@openid4vc/oauth2";

/**
 * Parses an application/x-www-form-urlencoded string into an object.
 *
 * @param text - The URL-encoded string
 * @returns A key-value object representing the parsed parameters
 */
export function parseXwwwFormUrlEncoded(text: string) {
  return Object.fromEntries(Array.from(new URLSearchParams(text).entries()));
}

export const callbacks = {
  /**
   * Hashes data using the specified algorithm.
   *
   * @param data - The data to hash
   * @param alg - The hashing algorithm to use
   * @returns A Buffer containing the hash
   */
  hash: (data, alg) =>
    crypto.createHash(alg.replace("-", "").toLowerCase()).update(data).digest(),

  /**
   * Generates a cryptographically secure random byte buffer.
   *
   * @param bytes - The number of bytes to generate
   * @returns A Buffer containing random bytes
   */
  generateRandom: (bytes) => crypto.randomBytes(bytes),

  /**
   * Provides client authentication callback (currently returns "none").
   */
  clientAuthentication: clientAuthenticationNone(),

  /**
   * Verifies a JWT using the signer's public JWK.
   *
   * @param signer - The signer containing method and key information
   * @param compact - The compact serialized JWT
   * @param payload - The JWT payload used for date validation
   * @returns An object indicating verification result and optionally the signer's JWK
   */
  verifyJwt: async (signer, { compact, payload }) => {
    let jwk: Jwk;
    if (signer.method === "did") {
      jwk = JSON.parse(
        encodeToUtf8String(
          decodeBase64(signer.didUrl.split("#")[0].replace("did:jwk:", "")),
        ),
      );
    } else if (signer.method === "jwk") {
      jwk = signer.publicJwk;
    } else {
      throw new Error("Signer method not supported");
    }

    const josePublicKey = await jose.importJWK(jwk as jose.JWK, signer.alg);
    try {
      await jose.jwtVerify(compact, josePublicKey, {
        currentDate: payload.exp
          ? new Date((payload.exp - 300) * 1000)
          : undefined,
      });
      return {
        verified: true,
        signerJwk: jwk,
      };
    } catch (error) {
      return {
        verified: false,
      };
    }
  },
} as const satisfies Partial<CallbackContext>;

/**
 * Returns a callback function for signing JWTs using the matching private key.
 *
 * @param privateJwks - Array of private JWKs to choose from for signing
 * @returns A SignJwtCallback function
 */
export const getSignJwtCallback = (privateJwks: Jwk[]): SignJwtCallback => {
  return async (signer, { header, payload }) => {
    let jwk: Jwk;
    if (signer.method === "did") {
      jwk = JSON.parse(
        encodeToUtf8String(
          decodeBase64(signer.didUrl.split("#")[0].replace("did:jwk:", "")),
        ),
      );
    } else if (signer.method === "jwk") {
      jwk = signer.publicJwk;
    } else {
      throw new Error("Signer method not supported");
    }

    const jwkThumprint = await calculateJwkThumbprint({
      jwk,
      hashAlgorithm: HashAlgorithm.Sha256,
      hashCallback: callbacks.hash,
    });

    const privateJwk = await Promise.all(
      privateJwks.map(async (jwk) =>
        (await calculateJwkThumbprint({
          hashAlgorithm: HashAlgorithm.Sha256,
          hashCallback: callbacks.hash,
          jwk,
        })) === jwkThumprint
          ? jwk
          : undefined,
      ),
    ).then((jwks) => jwks.find((jwk) => jwk !== undefined));

    if (!privateJwk) {
      throw new Error(
        `No private key available for public jwk \n${JSON.stringify(jwk, null, 2)}`,
      );
    }

    const josePrivateKey = await jose.importJWK(
      privateJwk as jose.JWK,
      signer.alg,
    );
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(header)
      .sign(josePrivateKey);

    return {
      jwt: jwt,
      signerJwk: jwk,
    };
  };
};
