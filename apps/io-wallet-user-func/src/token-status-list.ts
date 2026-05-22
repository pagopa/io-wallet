import * as RTE from "fp-ts/ReaderTaskEither";
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
    kid,
    statusListCredentialUrl,
    x5c,
  }: {
    bitString: Buffer;
    kid: string;
    statusListCredentialUrl: string;
    x5c: string[];
  }): RTE.ReaderTaskEither<Signer, Error, string> =>
  (signer) =>
    signer.createJwtAndSign(
      {
        typ: statusListJwtType,
        x5c,
      },
      kid,
      "ES256",
      statusListJwtDuration,
    )({
      status_list: {
        bits: statusListBits,
        lst: encodeStatusListBitstring(bitString),
      },
      sub: statusListCredentialUrl,
    });
