import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { decode } from "cbor-x";
import * as t from "io-ts";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/lib/Apply";
import { JwkPublicKey } from "io-wallet-common/jwk";
import { parse } from "@pagopa/handler-kit";
import { ValidatedAttestation } from "../../../attestation-service";
import { verifyAttestation } from "./attestation";
import { verifyAssertion } from "./assertion";

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

export const validateiOSAttestation = (
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
      () => new Error(`[iOS Attestation] Unable to decode data`)
    ),
    E.chainW(
      parse(iOsAttestation, "[iOS Attestation] attestation format is invalid")
    ),
    TE.fromEither,
    TE.chain((decodedAttestation) =>
      pipe(
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
        ),
        TE.chainW((result) =>
          pipe(
            result.hardwareKey,
            parse(JwkPublicKey, "Invalid JWK Public Key"),
            E.map((hardwareKey) => ({ ...result, hardwareKey })),
            TE.fromEither
          )
        )
      )
    )
  );

// iOS assertion type
export const iOsAssertion = t.type({
  signature: buffer,
  authenticatorData: buffer,
});

export type iOsAssertion = t.TypeOf<typeof iOsAssertion>;

export const validateiOSAssertion = (
  integrityAssertion: NonEmptyString,
  hardwareSignature: NonEmptyString,
  clientData: string,
  hardwareKey: JwkPublicKey,
  signCount: number,
  bundleIdentifier: string,
  teamIdentifier: string,
  skipSignatureValidation: boolean
) =>
  pipe(
    sequenceS(E.Applicative)({
      authenticatorData: E.tryCatch(
        () => Buffer.from(integrityAssertion, "base64"),
        E.toError
      ),
      signature: E.tryCatch(
        () => Buffer.from(hardwareSignature, "base64"),
        E.toError
      ),
    }),
    E.chainW(
      parse(iOsAssertion, "[iOS Assertion] assertion format is invalid")
    ),
    TE.fromEither,
    TE.chain((decodedAssertion) =>
      TE.tryCatch(
        () =>
          verifyAssertion({
            decodedAssertion,
            clientData,
            bundleIdentifier,
            teamIdentifier,
            hardwareKey,
            signCount,
            skipSignatureValidation,
          }),
        E.toError
      )
    )
  );
