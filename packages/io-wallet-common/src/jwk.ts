import * as t from "io-ts";
import { calculateJwkThumbprint } from "jose";

export const ECKeyWithoutKid = t.type({
  crv: t.string,
  kty: t.literal("EC"),
  x: t.string,
  y: t.string,
});

export const ECPublicKey = t.intersection([
  ECKeyWithoutKid,
  t.partial({
    kid: t.string,
  }),
]);

export type ECPublicKey = t.TypeOf<typeof ECPublicKey>;

export const ECPublicKeyWithKid = t.intersection([
  ECPublicKey,
  t.type({
    kid: t.string,
  }),
]);

export type ECPublicKeyWithKid = t.TypeOf<typeof ECPublicKeyWithKid>;

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

/**
 * The Public Key JWK type. It could be either an ECKey or an RSAKey.
 */
export const JwkPublicKey = t.union([RSAKey, ECPublicKey], "JwkPublicKey");
export type JwkPublicKey = t.TypeOf<typeof JwkPublicKey>;

export const areJwksEqual = async (
  left: ECPublicKey,
  right: ECPublicKey,
): Promise<boolean> => {
  const [leftThumb, rightThumb] = await Promise.all([
    calculateJwkThumbprint(left, "sha256"),
    calculateJwkThumbprint(right, "sha256"),
  ]);

  return leftThumb === rightThumb;
};
