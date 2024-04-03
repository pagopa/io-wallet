import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { decode } from "cbor-x";
import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { validate } from "../../../validation";
import { ValidatedAttestation } from "../../../attestation-service";
import { verifyAttestation } from "./attestation";

const buffer = new t.Type<Buffer, Buffer, unknown>(
  "buffer",
  (input: unknown): input is Buffer => Buffer.isBuffer(input),
  (input, context) =>
    Buffer.isBuffer(input) ? t.success(input) : t.failure(input, context),
  t.identity
);

// iOS attestation type
export const iOsAttestation = t.type({
  fmt: t.literal("apple-appattest"),
  attStmt: t.type({
    x5c: t.array(buffer),
    receipt: buffer,
  }),
  authData: buffer,
});

export type iOsAttestation = t.TypeOf<typeof iOsAttestation>;

export const valiateiOSAttestation = (
  data: Buffer,
  challenge: NonEmptyString,
  keyId: string,
  bundleIdentifier: string,
  teamIdentifier: string,
  appleRootCertificate: string,
  allowDevelopmentEnvironment: boolean
): TE.TaskEither<Error, ValidatedAttestation> =>
  pipe(
    E.tryCatch(
      () => decode(data),
      () => new Error(`Unable to decode data`)
    ),
    E.chainW(validate(iOsAttestation, "iOS attestation format is invalid")),
    TE.fromEither,
    TE.chain((decodedAttestation) =>
      TE.tryCatch(
        () =>
          verifyAttestation({
            decodedAttestation,
            challenge,
            keyId,
            bundleIdentifier,
            teamIdentifier,
            allowDevelopmentEnvironment,
            appleRootCertificate,
          }),
        E.toError
      )
    )
  );
