import * as t from "io-ts";

import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";

import { validate } from "./validation";

export const ECKey = t.intersection([
  t.type({
    crv: t.string,
    kty: t.literal("EC"),
    x: t.string,
    y: t.string,
  }),
  t.partial({
    kid: t.string,
  }),
]);

export type ECKey = t.TypeOf<typeof ECKey>;

export const ECPrivateKey = t.intersection([
  ECKey,
  t.type({
    d: t.string,
  }),
]);

export type ECPrivateKey = t.TypeOf<typeof ECPrivateKey>;

export const RSAKey = t.intersection([
  t.type({
    e: t.string,
    kty: t.literal("RSA"),
    n: t.string,
  }),
  t.partial({
    alg: t.string,
    kid: t.string,
  }),
]);

export type RSAKey = t.TypeOf<typeof RSAKey>;

export const RSAPrivateKey = t.intersection([
  RSAKey,
  t.type({
    d: t.string,
  }),
  t.partial({
    p: t.string,
    q: t.string,
    u: t.string,
    dp: t.string,
    dq: t.string,
    qi: t.string,
  }),
]);

export type RSAPrivateKey = t.TypeOf<typeof RSAPrivateKey>;

/**
 * The Public Key JWK type. It could be either an ECKey or an RSAKey.
 */
export const JwkPublicKey = t.union([RSAKey, ECKey], "JwkPublicKey");
export type JwkPublicKey = t.TypeOf<typeof JwkPublicKey>;

/**
 * The Private Key JWK type. It could be either an ECPrivateKey or an RSAPrivateKey.
 */
export const JwkPrivateKey = t.union(
  [RSAPrivateKey, ECPrivateKey],
  "JwkPrivateKey"
);
export type JwkPrivateKey = t.TypeOf<typeof JwkPrivateKey>;

/**
 * A generic JWK. It could be either an ECPrivateKey,RSAPrivateKey,ECKey or RSAKey.
 */
export const Jwk = t.union([JwkPublicKey, JwkPrivateKey], "Jwk");
export type Jwk = t.TypeOf<typeof Jwk>;

export const fromBase64ToJwks = (b64: string) =>
  pipe(
    E.tryCatch(() => Buffer.from(b64, "base64").toString(), E.toError),
    E.map(JSON.parse),
    E.chainW(validate(t.array(Jwk), "Invalid JWKs"))
  );
