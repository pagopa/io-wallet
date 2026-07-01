import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import type { SignAlgorithm } from "./infra/crypto/signer";

import { removeTrailingSlash } from "./url";

export interface WalletInstanceAttestationData {
  jwk: JwkPublicKey;
  jwkAlg: SignAlgorithm;
  kid: string;
  // oauthClientSub: string;
  sub: string;
  walletProviderName: string;
  // walletSolutionVersion: string;
  x5c: string[];
}

interface WalletInstanceAttestationJwtModel {
  cnf: {
    jwk: JwkPublicKey & {
      alg: SignAlgorithm;
    };
  };
  // eudi_wallet_info: {
  //   general_info: {
  //     wallet_provider_name: string;
  //     wallet_solution_id: string;
  //     wallet_solution_version: string;
  //   };
  // };
  iss: string;
  sub: string;
  wallet_link: string;
  wallet_name: string;
  x5c: string[];
}

export const WalletInstanceAttestationToJwtModel: E.Encoder<
  WalletInstanceAttestationJwtModel,
  WalletInstanceAttestationData
> = {
  encode: ({
    jwk,
    jwkAlg,
    // oauthClientSub,
    sub,
    walletProviderName,
    // walletSolutionVersion,
    x5c,
  }) => ({
    cnf: {
      jwk: {
        ...jwk,
        alg: jwkAlg,
      },
    },
    // eudi_wallet_info: {
    //   general_info: {
    //     wallet_provider_name: removeTrailingSlash(walletProviderName),
    //     wallet_solution_id: "appio",
    //     wallet_solution_version: walletSolutionVersion,
    //   },
    // },
    iss: removeTrailingSlash(walletProviderName),
    sub,
    // sub: removeTrailingSlash(oauthClientSub),
    wallet_link: "https://ioapp.it/",
    wallet_name: "App IO",
    x5c,
  }),
};
