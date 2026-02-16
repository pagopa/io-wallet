import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as E from "io-ts/lib/Encoder";
import { JwkPublicKey } from "io-wallet-common/jwk";

import { WalletAttestationsEnvironment } from "@/wallet-attestations";

import { removeTrailingSlash } from "./url";

interface WalletAppAttestationData {
  iss: string;
  kid: string;
  sub: string;
  walletInstancePublicKey: JwkPublicKey;
  x5c: string[];
}

interface WalletAppAttestationJwtModel {
  cnf: {
    jwk: JwkPublicKey;
  };
  iss: string;
  kid: string;
  sub: string;
  x5c: string[];
}

const WalletAppAttestationToJwtModel: E.Encoder<
  WalletAppAttestationJwtModel,
  WalletAppAttestationData
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

export const createWalletAppAttestation =
  (
    walletAttestationData: WalletAppAttestationData,
  ): RTE.ReaderTaskEither<WalletAttestationsEnvironment, Error, string> =>
  (dep) =>
    pipe(
      walletAttestationData,
      WalletAppAttestationToJwtModel.encode,
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
