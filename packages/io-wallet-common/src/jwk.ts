import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as t from "io-ts";
import { calculateJwkThumbprint } from "jose";

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

const ECPrivateKey = t.intersection([
  ECKey,
  t.type({
    d: t.string,
  }),
]);

type ECPrivateKey = t.TypeOf<typeof ECPrivateKey>;

export const ECPrivateKeyWithKid = t.intersection(
  [ECPrivateKey, t.type({ kid: t.string })],
  "ECPrivateKeyWithKid",
);
export type ECPrivateKeyWithKid = t.TypeOf<typeof ECPrivateKeyWithKid>;

const RSAKey = t.intersection([
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

type RSAKey = t.TypeOf<typeof RSAKey>;

const RSAPrivateKey = t.intersection([
  RSAKey,
  t.type({
    d: t.string,
  }),
  t.partial({
    dp: t.string,
    dq: t.string,
    p: t.string,
    q: t.string,
    qi: t.string,
    u: t.string,
  }),
]);

type RSAPrivateKey = t.TypeOf<typeof RSAPrivateKey>;

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
  "JwkPrivateKey",
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
    E.chain(J.parse),
    E.mapLeft(() => new Error("Unable to parse JWKs string")),
    E.chainW(H.parse(t.array(Jwk), "Invalid JWKs")),
  );

export const areJwksEqual = async (
  left: ECKey,
  right: ECKey,
): Promise<boolean> => {
  const [leftThumb, rightThumb] = await Promise.all([
    calculateJwkThumbprint(left, "sha256"),
    calculateJwkThumbprint(right, "sha256"),
  ]);

  return leftThumb === rightThumb;
};
