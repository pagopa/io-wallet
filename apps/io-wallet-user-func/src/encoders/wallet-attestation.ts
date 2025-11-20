import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { removeTrailingSlash } from "../url";

export interface WalletAttestationData {
  aal: string;
  iss: string;
  kid: string;
  sub: string;
  walletInstancePublicKey: JwkPublicKey;
  walletLink: string;
  walletName: string;
}

interface WalletAttestationJwtModel {
  aal: string;
  cnf: {
    jwk: JwkPublicKey;
  };
  iss: string;
  kid: string;
  sub: string;
  wallet_link: string;
  wallet_name: string;
}

export const WalletAttestationToJwtModel: E.Encoder<
  WalletAttestationJwtModel,
  WalletAttestationData
> = {
  encode: ({
    aal,
    iss,
    kid,
    sub,
    walletInstancePublicKey,
    walletLink,
    walletName,
  }) => ({
    aal,
    cnf: {
      jwk: walletInstancePublicKey,
    },
    iss: removeTrailingSlash(iss),
    kid,
    sub: removeTrailingSlash(sub),
    wallet_link: walletLink,
    wallet_name: walletName,
  }),
};
