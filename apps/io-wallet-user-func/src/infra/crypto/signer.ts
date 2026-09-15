import { CryptographyClient } from "@azure/keyvault-keys";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as jose from "jose";

export type SignAlgorithm = "ES256" | "ES384" | "ES512";

export interface SignJwtEnvironment {
  cryptographyClient: Pick<CryptographyClient, "signData">;
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
  payload: jose.JWTPayload;
}

const createJwtSigningInput = ({
  duration,
  header,
  payload,
}: {
  duration: number;
  header: JwtProtectedHeader;
  payload: jose.JWTPayload;
}) => {
  const iat = Math.floor(Date.now() / 1000);
  const { trustChain, ...headerParameters } = header;
  const protectedHeader = {
    ...headerParameters,
    trust_chain: trustChain,
  };
  const claims = {
    ...payload,
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
    payload,
  }: SignJwtOptions): RTE.ReaderTaskEither<SignJwtEnvironment, Error, string> =>
  ({ cryptographyClient }) =>
    pipe(
      E.tryCatch(() => getSignAlgorithmFromCurve(crv), E.toError),
      TE.fromEither,
      TE.chain((alg) =>
        pipe(
          E.tryCatch(
            () =>
              createJwtSigningInput({
                duration,
                header: {
                  ...header,
                  alg,
                },
                payload,
              }),
            E.toError,
          ),
          TE.fromEither,
          TE.chain((signingInput) =>
            TE.tryCatch(
              async () => {
                const { result } = await cryptographyClient.signData(
                  alg,
                  Buffer.from(signingInput),
                );

                return `${signingInput}.${jose.base64url.encode(result)}`;
              },
              (reason) => {
                const message =
                  reason instanceof Error ? reason.message : String(reason);

                return new Error(
                  `Unable to sign JWT with Azure Key Vault: ${message}`,
                );
              },
            ),
          ),
        ),
      ),
    );
