import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { validateJwkKid } from "io-wallet-common/jwk";
import { deflateSync } from "zlib";

import { Signer } from "@/signer";

export const statusListJwtType = "statuslist+jwt";
const statusListBits = 1;
const statusListJwtDuration = "24h";

const encodeStatusListBitstring = (bitString: Buffer) =>
  deflateSync(bitString, { level: 9 }).toString("base64url");

export const createTokenStatusList =
  ({
    bitString,
    statusListCredentialUrl,
  }: {
    bitString: Buffer;
    statusListCredentialUrl: string;
  }): RTE.ReaderTaskEither<Signer, Error, string> =>
  (signer) =>
    pipe(
      "EC",
      signer.getFirstPublicKeyByKty,
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.chain(({ kid }) =>
        signer.createJwtAndSign(
          { typ: statusListJwtType },
          kid,
          "ES256",
          statusListJwtDuration,
        )({
          status_list: {
            bits: statusListBits,
            lst: encodeStatusListBitstring(bitString),
          },
          sub: statusListCredentialUrl,
        }),
      ),
    );
