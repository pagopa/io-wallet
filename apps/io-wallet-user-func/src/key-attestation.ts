import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { removeTrailingSlash } from "./url";

export interface AttestedKey {
  jwk: JwkPublicKey;
  keyStorage: "iso_18045_enhanced-basic" | "iso_18045_moderate";
  userAuthentication: "iso_18045_moderate";
}

export interface KeyAttestationData {
  attestedKeys: readonly AttestedKey[];
  kid: string;
  platform: "android" | "ios";
  status: {
    statusList: {
      idx: number;
      uri: string;
    };
  };
  walletProviderName: string;
  // walletSolutionVersion: string;
  x5c: string[];
}

interface KeyAttestationJwtModel {
  attested_keys: JwkPublicKey[];
  // eudi_wallet_info: {
  //   general_info: {
  //     wallet_provider_name: string;
  //     wallet_solution_id: string;
  //     wallet_solution_version: string;
  //   };
  //   key_storage_info: {
  //     keys_exportable: boolean;
  //     storage_type: string;
  //   };
  // };
  iss: string;
  key_storage: ("iso_18045_enhanced-basic" | "iso_18045_moderate")[];
  status: {
    status_list: {
      idx: number;
      uri: string;
    };
  };
  user_authentication: string[];
  x5c: string[];
}

export const KeyAttestationToJwtModel: E.Encoder<
  KeyAttestationJwtModel,
  KeyAttestationData
> = {
  encode: ({
    attestedKeys,
    status,
    walletProviderName,
    // walletSolutionVersion,
    x5c,
  }) => ({
    attested_keys: attestedKeys.map(({ jwk }) => jwk),
    // eudi_wallet_info: {
    //   general_info: {
    //     wallet_provider_name: removeTrailingSlash(walletProviderName),
    //     wallet_solution_id: "appio",
    //     wallet_solution_version: walletSolutionVersion,
    //   },
    //   key_storage_info: {
    //     keys_exportable: false,
    //     storage_type: "LOCAL_NATIVE",
    //   },
    // },
    iss: removeTrailingSlash(walletProviderName),
    key_storage: attestedKeys.map(({ keyStorage }) => keyStorage),
    status: {
      status_list: {
        idx: status.statusList.idx,
        uri: status.statusList.uri,
      },
    },
    user_authentication: attestedKeys.map(
      ({ userAuthentication }) => userAuthentication,
    ),
    x5c,
  }),
};
