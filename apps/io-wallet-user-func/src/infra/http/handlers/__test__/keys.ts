import { CryptoSigner } from "@/infra/crypto/signer";

export const publicEcKey = {
  crv: "P-256",
  kid: "ec#1",
  kty: "EC" as const,
  x: "CakCjesDBwXeReRwLRzmhg6UwOKfM0NZpHYHjC0iucU",
  y: "a5cs0ywZzV6MGeBR8eIHyrs8KoAqv0DuW6qqSkZFCMM",
};

export const privateEcKey = {
  ...publicEcKey,
  d: "vOTIOnH_rDol5cyaWL25DX4iGu_WU_l-AoTLmGIV_tg",
};

export const jwks = [privateEcKey];

export const signer = new CryptoSigner({
  jwks,
  jwtDefaultAlg: "ES256",
  jwtDefaultDuration: "1h",
});
