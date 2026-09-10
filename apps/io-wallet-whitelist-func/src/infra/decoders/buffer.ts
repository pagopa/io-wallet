import * as t from "io-ts";

export const BufferDecoder = new t.Type<Buffer, Buffer, unknown>(
  "Buffer",
  (input: unknown): input is Buffer => Buffer.isBuffer(input),
  (input, context) =>
    Buffer.isBuffer(input) ? t.success(input) : t.failure(input, context),
  t.identity,
);
