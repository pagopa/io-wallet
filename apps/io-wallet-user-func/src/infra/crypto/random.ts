import crypto from "crypto";
import { pipe } from "fp-ts/function";
import * as IOE from "fp-ts/IOEither";

const generateRandomBytes: IOE.IOEither<Error, Buffer> = IOE.tryCatch(
  () => crypto.randomBytes(16),
  (error) => new Error(`Failed to generate random bytes: ${error}`),
);

export const generateRandomHex: IOE.IOEither<Error, string> = pipe(
  generateRandomBytes,
  IOE.map((buf) => buf.toString("hex")),
);
