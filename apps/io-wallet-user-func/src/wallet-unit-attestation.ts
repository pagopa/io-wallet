import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { SignerMetadataEnvironment } from "@/infra/signer-metadata";

import { FederationEntity } from "./entity-configuration";
import { removeTrailingSlash } from "./url";

export interface AttestedKey {
  jwk: JwkPublicKey;
  keyStorage: "iso_18045_enhanced-basic" | "iso_18045_moderate";
  userAuthentication: "iso_18045_moderate";
}

export interface WalletUnitAttestationData {
  attestedKeys: readonly AttestedKey[];
  kid: string;
  platform: "android" | "ios";
  walletProviderName: string;
  // walletSolutionVersion: string;
  x5c: string[];
}

interface WalletUnitAttestationJwtModel {
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
  kid: string;
  status: {
    status_list: {
      idx: number;
      uri: string;
    };
  };
  user_authentication: string[];
  x5c: string[];
}

const WalletUnitAttestationToJwtModel: E.Encoder<
  WalletUnitAttestationJwtModel,
  WalletUnitAttestationData
> = {
  encode: ({
    attestedKeys,
    kid,
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
    kid,
    status: {
      status_list: {
        idx: 412,
        uri: "https://revocation_url/statuslists/1",
      },
    },
    user_authentication: attestedKeys.map(
      ({ userAuthentication }) => userAuthentication,
    ),
    x5c,
  }),
};
export interface WalletUnitAttestationEnvironment extends SignerMetadataEnvironment {
  federationEntity: FederationEntity;
}

export const createWalletUnitAttestation =
  (
    walletAttestationData: WalletUnitAttestationData,
  ): RTE.ReaderTaskEither<WalletUnitAttestationEnvironment, Error, string> =>
  (dep) =>
    pipe(
      walletAttestationData,
      WalletUnitAttestationToJwtModel.encode,
      ({ kid, x5c, ...payload }) =>
        dep.signer.createJwtAndSign(
          {
            typ: "key-attestation+jwt",
            x5c,
          },
          kid,
          "ES256",
          "1y",
        )(payload),
    );
