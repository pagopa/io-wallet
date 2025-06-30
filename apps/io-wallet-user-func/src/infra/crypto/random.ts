import crypto from "crypto";
import * as IOE from "fp-ts/IOEither";
import { pipe } from "fp-ts/function";

const generateRandomBytes: IOE.IOEither<Error, Buffer> = IOE.tryCatch(
  () => crypto.randomBytes(16),
  (error) => new Error(`Failed to generate random bytes: ${error}`),
);

export const generateRandomHex: IOE.IOEither<Error, string> = pipe(
  generateRandomBytes,
  IOE.map((buf) => buf.toString("hex")),
);
