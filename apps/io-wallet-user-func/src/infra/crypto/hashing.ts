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

export const createHash = (
  data: ArrayBuffer | string,
): Buffer<ArrayBufferLike> => calculateSha256Hash(data).digest();

export const createHashBase64url = (input: ArrayBuffer | string): string =>
  calculateSha256Hash(input).digest("base64url");
