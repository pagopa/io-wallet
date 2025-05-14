import { z } from "zod";

export const ECKey = z.object({
  crv: z.string(),
  kid: z.string().optional(),
  kty: z.literal("EC"),
  x: z.string(),
  y: z.string(),
});
export type ECKey = z.infer<typeof ECKey>;

export const ECPrivateKey = ECKey.extend({
  d: z.string(),
});
export type ECPrivateKey = z.infer<typeof ECPrivateKey>;

export const RSAKey = z.object({
  alg: z.string().optional(),
  e: z.string(),
  kid: z.string().optional(),
  kty: z.literal("RSA"),
  n: z.string(),
});
export type RSAKey = z.infer<typeof RSAKey>;

export const RSAPrivateKey = RSAKey.extend({
  d: z.string(),
  dp: z.string().optional(),
  dq: z.string().optional(),
  p: z.string().optional(),
  q: z.string().optional(),
  qi: z.string().optional(),
  u: z.string().optional(),
});
export type RSAPrivateKey = z.infer<typeof RSAPrivateKey>;

/**
 * The Public Key JWK type. It could be either an ECKey or an RSAKey.
 */
export const JwkPublicKey = z.discriminatedUnion("kty", [RSAKey, ECKey]);
export type JwkPublicKey = z.infer<typeof JwkPublicKey>;

/**
 * The Private Key JWK type. It could be either an ECPrivateKey or an RSAPrivateKey.
 */
export const JwkPrivateKey = z.discriminatedUnion("kty", [
  RSAPrivateKey,
  ECPrivateKey,
]);
export type JwkPrivateKey = z.infer<typeof JwkPrivateKey>;

/**
 * A generic JWK. It could be either an ECPrivateKey,RSAPrivateKey,ECKey or RSAKey.
 */
export const Jwk = z.union([JwkPublicKey, JwkPrivateKey]);
export type Jwk = z.infer<typeof Jwk>;

export const JwksMetadata = z.object({
  keys: z.array(JwkPublicKey),
});
export type JwksMetadata = z.infer<typeof JwksMetadata>;

const ECPrivateKeyWithKidCodec = ECPrivateKey.extend({
  kid: z.string(),
});
export type ECPrivateKeyWithKid = z.infer<typeof ECPrivateKeyWithKidCodec>;
