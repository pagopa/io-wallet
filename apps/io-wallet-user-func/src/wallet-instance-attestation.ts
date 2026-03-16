import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { FederationEntity } from "./entity-configuration";
import { SignerMetadataEnvironment } from "./infra/signer-metadata";
import { removeTrailingSlash } from "./url";

export interface WalletInstanceAttestationData {
  jwk: JwkPublicKey;
  kid: string;
  oauthClientSub: string;
  walletProviderName: string;
  walletSolutionVersion: string;
  x5c: string[];
}

interface WalletInstanceAttestationJwtModel {
  cnf: {
    jwk: JwkPublicKey;
  };
  eudi_wallet_info: {
    general_info: {
      wallet_provider_name: string;
      wallet_solution_id: string;
      wallet_solution_version: string;
    };
  };
  iss: string;
  kid: string;
  sub: string;
  x5c: string[];
}

const WalletInstanceAttestationToJwtModel: E.Encoder<
  WalletInstanceAttestationJwtModel,
  WalletInstanceAttestationData
> = {
  encode: ({
    jwk,
    kid,
    oauthClientSub,
    walletProviderName,
    walletSolutionVersion,
    x5c,
  }) => ({
    cnf: {
      jwk,
    },
    eudi_wallet_info: {
      general_info: {
        wallet_provider_name: removeTrailingSlash(walletProviderName),
        wallet_solution_id: "appio",
        wallet_solution_version: walletSolutionVersion,
      },
    },
    iss: removeTrailingSlash(walletProviderName),
    kid,
    sub: removeTrailingSlash(oauthClientSub),
    x5c,
  }),
};

export interface WalletInstanceAttestationEnvironment extends SignerMetadataEnvironment {
  federationEntity: FederationEntity;
  walletAttestationConfig: {
    oauthClientSub: string;
  };
}

export const createWalletInstanceAttestation =
  (
    walletAttestationData: WalletInstanceAttestationData,
  ): RTE.ReaderTaskEither<
    WalletInstanceAttestationEnvironment,
    Error,
    string
  > =>
  (dep) =>
    pipe(
      walletAttestationData,
      WalletInstanceAttestationToJwtModel.encode,
      ({ kid, x5c, ...payload }) =>
        dep.signer.createJwtAndSign(
          {
            typ: "oauth-client-attestation+jwt",
            x5c,
          },
          kid,
          "ES256",
          "1h",
        )(payload),
    );
