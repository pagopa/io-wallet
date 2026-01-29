import { parse } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { decode as cborDecode } from "cbor-x";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { ValidatedAttestation } from "../../../attestation-service";
import { IosAssertionError, IosAttestationError } from "../errors";
import { verifyAssertion } from "./assertion";
import { verifyAttestation } from "./attestation";

const buffer = new t.Type<Buffer, Buffer, unknown>(
  "buffer",
  (input: unknown): input is Buffer => Buffer.isBuffer(input),
  (input, context) =>
    Buffer.isBuffer(input) ? t.success(input) : t.failure(input, context),
  t.identity,
);

export const iOsAttestation = t.type({
  attStmt: t.type({
    receipt: buffer,
    x5c: t.array(buffer),
  }),
  authData: buffer,
  fmt: t.literal("apple-appattest"),
});

export type iOsAttestation = t.TypeOf<typeof iOsAttestation>;

export const parseIosAttestation = (data: Buffer) =>
  pipe(
    E.tryCatch(
      () => cborDecode(data),
      () => new IosAttestationError("Unable to decode data"),
    ),
    E.chainW(
      flow(
        parse(iOsAttestation),
        E.mapLeft(
          () => new IosAttestationError("Attestation format is invalid"),
        ),
      ),
    ),
  );

export const validateiOSAttestation = (
  decodedAttestation: iOsAttestation,
  challenge: NonEmptyString,
  keyId: string,
  bundleIdentifiers: string[],
  teamIdentifier: string,
  appleRootCertificate: string,
  allowDevelopmentEnvironment: boolean,
): TE.TaskEither<Error, ValidatedAttestation> =>
  pipe(
    TE.tryCatch(
      () =>
        verifyAttestation({
          allowDevelopmentEnvironment,
          appleRootCertificate,
          bundleIdentifiers,
          challenge,
          decodedAttestation,
          keyId,
          teamIdentifier,
        }),
      E.toError,
    ),
    TE.chain((attestationValidationResult) =>
      attestationValidationResult.success
        ? TE.right(attestationValidationResult)
        : TE.left(new IosAttestationError(attestationValidationResult.reason)),
    ),
    TE.chainW((result) =>
      pipe(
        result.hardwareKey,
        parse(JwkPublicKey, "Invalid JWK Public Key"),
        E.map((hardwareKey) => ({ ...result, hardwareKey })),
        TE.fromEither,
      ),
    ),
  );

export const iOsAssertion = t.type({
  authenticatorData: buffer,
  signature: buffer,
});

export type iOsAssertion = t.TypeOf<typeof iOsAssertion>;

export const parseIosAssertion = ({
  hardwareSignature,
  integrityAssertion,
}: {
  hardwareSignature: NonEmptyString;
  integrityAssertion: NonEmptyString;
}) =>
  pipe(
    sequenceS(E.Applicative)({
      authenticatorData: E.tryCatch(
        () => Buffer.from(integrityAssertion, "base64"),
        E.toError,
      ),
      signature: E.tryCatch(
        () => Buffer.from(hardwareSignature, "base64"),
        E.toError,
      ),
    }),
    E.mapLeft(() => new IosAssertionError("Unable to decode data")),
    E.chainW(
      flow(
        parse(iOsAssertion),
        E.mapLeft(() => new IosAssertionError("Assertion format is invalid")),
      ),
    ),
  );

export const validateiOSAssertion = (
  decodedAssertion: iOsAssertion,
  clientData: string,
  hardwareKey: JwkPublicKey,
  signCount: number,
  bundleIdentifiers: string[],
  teamIdentifier: string,
  skipSignatureValidation: boolean,
) =>
  pipe(
    TE.tryCatch(
      () =>
        verifyAssertion({
          bundleIdentifiers,
          clientData,
          decodedAssertion,
          hardwareKey,
          signCount,
          skipSignatureValidation,
          teamIdentifier,
        }),
      E.toError,
    ),
    TE.chain((assertionValidationResult) =>
      assertionValidationResult.success
        ? TE.right(undefined)
        : TE.left(new IosAssertionError(assertionValidationResult.reason)),
    ),
  );
