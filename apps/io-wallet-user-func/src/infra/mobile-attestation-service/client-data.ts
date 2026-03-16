import { ValidationError } from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as J from "fp-ts/Json";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { ECKey, JwkPublicKey } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";

type ClientDataInput =
  | {
      challenge: NonEmptyString;
      keysThumbprints: readonly string[];
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
  jwks: readonly ECKey[],
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
  "keysThumbprints" in input
    ? pipe(
        input.keysThumbprints,
        E.fromPredicate(
          (thumbprints) => thumbprints.length > 0,
          () => new ValidationError(["No key thumbprints provided"]),
        ),
        TE.fromEither,
        TE.chain((keysThumbprints) =>
          serializeClientData({
            challenge: input.challenge,
            jwk_thumbprints: keysThumbprints,
          }),
        ),
      )
    : serializeClientData({
        challenge: input.challenge,
        jwk_thumbprint: input.thumbprint,
      });
