import { ValidationError } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { ECKeyWithKid, JwkPublicKey } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";

type ClientDataInput =
  | {
      attestedKeysThumbprints: readonly string[];
      challenge: NonEmptyString;
    }
  | {
      challenge: NonEmptyString;
      thumbprint: string;
    };

const serializeClientData = (
  value: Record<string, unknown>,
): TE.TaskEither<ValidationError, string> =>
  pipe(
    value,
    J.stringify,
    E.mapLeft(() => new ValidationError(["Unable to create clientData"])),
    TE.fromEither,
  );

export const toThumbprint = (jwk: JwkPublicKey): TE.TaskEither<Error, string> =>
  TE.tryCatch(() => calculateJwkThumbprint(jwk, "sha256"), E.toError);

export const toKeysThumbprints = (
  jwks: readonly ECKeyWithKid[],
): TE.TaskEither<Error | ValidationError, readonly string[]> =>
  pipe(
    jwks,
    E.fromPredicate(
      (keys) => keys.length > 0,
      () => new ValidationError(["No keys provided"]),
    ),
    TE.fromEither,
    TE.chain(RA.traverse(TE.ApplicativeSeq)(toThumbprint)),
  );

export const toClientData = (
  input: ClientDataInput,
): TE.TaskEither<Error | ValidationError, string> =>
  "attestedKeysThumbprints" in input
    ? pipe(
        input.attestedKeysThumbprints,
        E.fromPredicate(
          (thumbprints) => thumbprints.length > 0,
          () => new ValidationError(["No attested key thumbprints provided"]),
        ),
        TE.fromEither,
        TE.chain((attestedKeysThumbprints) =>
          serializeClientData({
            challenge: input.challenge,
            jwk_thumbprints: attestedKeysThumbprints,
          }),
        ),
      )
    : serializeClientData({
        challenge: input.challenge,
        jwk_thumbprint: input.thumbprint,
      });
