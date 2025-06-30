import crypto from "crypto";

export const createHashBase64url = (input: string): string =>
  crypto.createHash("sha256").update(input).digest("base64url");
