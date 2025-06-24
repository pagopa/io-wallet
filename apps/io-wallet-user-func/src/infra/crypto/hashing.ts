import crypto from "crypto";

const calculateSha256Hash = (input: ArrayBuffer | string): crypto.Hash => {
  const hash = crypto.createHash("sha256");
  if (typeof input === "string") {
    hash.update(input);
  } else {
    hash.update(Buffer.from(input));
  }
  return hash;
};

// TODO
export const createHash = (buffer: Uint8Array<ArrayBufferLike>) =>
  new Uint8Array(crypto.createHash("sha256").update(buffer).digest());

export const createHashBase64url = (input: ArrayBuffer | string): string =>
  calculateSha256Hash(input).digest("base64url");
