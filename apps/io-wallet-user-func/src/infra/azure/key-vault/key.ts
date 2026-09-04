import { KeyVaultKey } from "@azure/keyvault-keys";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { ECKeyWithoutKid } from "io-wallet-common/jwk";

const toBase64Url = (value: Uint8Array) =>
  Buffer.from(value).toString("base64url");

export const toPublicEcJwk = (
  key: KeyVaultKey,
): E.Either<Error, ECKeyWithoutKid> =>
  pipe(
    key.key,
    E.fromNullable(new Error("Key Vault key has no public key material")),
    E.chain(({ crv, kty, x, y }) =>
      kty === "EC" && crv !== undefined && x !== undefined && y !== undefined
        ? pipe(
            {
              crv,
              kty,
              x: toBase64Url(x),
              y: toBase64Url(y),
            },
            ECKeyWithoutKid.decode,
            E.mapLeft(() => new Error("Key Vault key is not an EC public key")),
          )
        : E.left(new Error("Key Vault key is not an EC public key")),
    ),
  );
