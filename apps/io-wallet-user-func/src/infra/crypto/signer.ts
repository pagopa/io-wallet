import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as jose from "jose";
import { createHash } from "node:crypto";

import type { KeyOperations } from "@/infra/crypto/key-operations-client";

export type SignAlgorithm = "ES256" | "ES384" | "ES512";

export interface SignJwtEnvironment {
  signJwt: KeyOperations["sign"];
}

interface JwtProtectedHeader extends SignJwtHeader {
  alg: SignAlgorithm;
  kid: string;
}

interface SignJwtHeader {
  kid: string;
  trustChain?: string[];
  typ: string;
  x5c?: string[];
}

interface SignJwtOptions {
  crv: string;
  duration: number;
  header: SignJwtHeader;
  keyName: string;
  payload: unknown;
}

const hashAlgorithmBySignAlgorithm: Record<SignAlgorithm, string> = {
  ES256: "sha256",
  ES384: "sha384",
  ES512: "sha512",
};

const createJwtSigningInput = ({
  duration,
  header,
  payload,
}: {
  duration: number;
  header: JwtProtectedHeader;
  payload: unknown;
}) => {
  const iat = Math.floor(Date.now() / 1000);
  const { trustChain, ...headerParameters } = header;
  const protectedHeader = {
    ...headerParameters,
    trust_chain: trustChain,
  };

  const payloadObj =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};

  const claims = {
    ...payloadObj,
    exp: iat + duration,
    iat,
  };

  return [
    jose.base64url.encode(JSON.stringify(protectedHeader)),
    jose.base64url.encode(JSON.stringify(claims)),
  ].join(".");
};

export const getSignAlgorithmFromCurve = (crv: string): SignAlgorithm => {
  switch (crv) {
    case "P-256":
      return "ES256";
    case "P-384":
      return "ES384";
    case "P-521":
      return "ES512";
    default:
      throw new Error(`The curve ${crv} is not supported`);
  }
};

export const signJwt =
  ({
    crv,
    duration,
    header,
    keyName,
    payload,
  }: SignJwtOptions): RTE.ReaderTaskEither<SignJwtEnvironment, Error, string> =>
  ({ signJwt: signJwtEnv }) =>
    pipe(
      E.tryCatch(() => getSignAlgorithmFromCurve(crv), E.toError),
      TE.fromEither,
      TE.chain((algorithm) =>
        pipe(
          E.tryCatch(
            () =>
              createJwtSigningInput({
                duration,
                header: {
                  ...header,
                  alg: algorithm,
                },
                payload,
              }),
            E.toError,
          ),
          TE.fromEither,
          TE.chain((signingInput) =>
            TE.tryCatch(
              async () => {
                const digest = createHash(
                  hashAlgorithmBySignAlgorithm[algorithm],
                )
                  .update(signingInput, "utf8")
                  .digest("base64url");
                const signature = await signJwtEnv(keyName, algorithm, digest);

                return `${signingInput}.${signature}`;
              },
              (reason) => {
                const message =
                  reason instanceof Error ? reason.message : String(reason);

                return new Error(`Unable to sign JWT: ${message}`);
              },
            ),
          ),
        ),
      ),
    );
