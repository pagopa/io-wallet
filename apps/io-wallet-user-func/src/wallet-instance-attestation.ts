import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { CertificateRepository } from "./certificates";
import { FederationEntity } from "./entity-configuration";
import { Signer } from "./signer";
import { removeTrailingSlash } from "./url";

interface WalletInstanceAttestationData {
  iss: string;
  kid: string;
  sub: string;
  walletInstancePublicKey: JwkPublicKey;
  x5c: string[];
}

interface WalletInstanceAttestationJwtModel {
  cnf: {
    jwk: JwkPublicKey;
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
  encode: ({ iss, kid, sub, walletInstancePublicKey, x5c }) => ({
    cnf: {
      jwk: walletInstancePublicKey,
    },
    iss: removeTrailingSlash(iss),
    kid,
    sub: removeTrailingSlash(sub),
    x5c,
  }),
};

export interface WalletInstanceAttestationEnvironment {
  certificateRepository: CertificateRepository;
  federationEntity: FederationEntity;
  signer: Signer;
  walletAttestationConfig: { trustAnchorUrl: ValidUrl };
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
