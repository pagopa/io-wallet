import { deflateSync } from "zlib";

const statusListBits = 1;

const encodeStatusListBitstring = (bitString: Buffer) =>
  deflateSync(bitString, { level: 9 }).toString("base64url");

export interface TokenStatusList {
  statusList: {
    bits: number;
    lst: string;
  };
  statusListCredentialUrl: string;
}

export const createTokenStatusList = ({
  bitString,
  statusListCredentialUrl,
}: {
  bitString: Buffer;
  statusListCredentialUrl: string;
}): TokenStatusList => ({
  statusList: {
    bits: statusListBits,
    lst: encodeStatusListBitstring(bitString),
  },
  statusListCredentialUrl,
});
