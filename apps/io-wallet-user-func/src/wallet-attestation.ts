import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as IOE from "fp-ts/IOEither";
import { sequenceT } from "fp-ts/lib/Apply";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { WalletAttestationData } from "./encoders/wallet-attestation";
import { FederationEntity } from "./entity-configuration";
import { createHashBase64url } from "./infra/crypto/hashing";
import { generateRandomHex } from "./infra/crypto/random";
import { removeTrailingSlash } from "./url";
import { WalletAttestationRequest } from "./wallet-attestation-request";
import { getLoAUri, LoA } from "./wallet-provider";

const disclosureToBase64Url = (disclosure: [string, string, unknown]): string =>
  pipe(disclosure, JSON.stringify, (str) =>
    Buffer.from(str).toString("base64url"),
  );

export interface WalletAttestationEnvironment {
  federationEntity: FederationEntity;
  walletAttestationConfig: WalletAttestationConfig;
}

interface WalletAttestationConfig {
  trustAnchorUrl: ValidUrl;
  walletLink: string;
  walletName: string;
}

export const getWalletAttestationData =
  (
    walletAttestationRequest: WalletAttestationRequest,
    walletAttestationSigningKid: string,
  ): R.Reader<WalletAttestationEnvironment, WalletAttestationData> =>
  ({
    federationEntity: { basePathV10: basePath },
    walletAttestationConfig: { walletLink, walletName },
  }) => ({
    aal: pipe(basePath, getLoAUri(LoA.basic)),
    iss: basePath.href,
    kid: walletAttestationSigningKid,
    sub: walletAttestationRequest.header.kid,
    walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
    walletLink,
    walletName,
  });

const getDisclosures = ({
  walletLink,
  walletName,
}: {
  walletLink: string;
  walletName: string;
}): IOE.IOEither<Error, [string, string]> =>
  pipe(
    sequenceT(IOE.ApplicativePar)(generateRandomHex, generateRandomHex),
    IOE.map(([nameSalt, linkSalt]) => [
      disclosureToBase64Url([nameSalt, "wallet_name", walletName]),
      disclosureToBase64Url([linkSalt, "wallet_link", walletLink]),
    ]),
  );

export interface WalletAttestationSdJwtClaims {
  claims: {
    _sd: string[];
    _sd_alg: "sha-256";
    aal: string;
    cnf: {
      jwk: WalletAttestationData["walletInstancePublicKey"];
    };
    iss: string;
    sub: string;
    vct: string;
  };
  disclosures: string[];
}

export const createWalletAttestationSdJwtClaims =
  (
    walletAttestationData: WalletAttestationData,
  ): RTE.ReaderTaskEither<
    WalletAttestationEnvironment,
    Error,
    WalletAttestationSdJwtClaims
  > =>
  ({ walletAttestationConfig: { trustAnchorUrl } }) =>
    pipe(
      walletAttestationData,
      ({ iss, sub, walletInstancePublicKey, ...rest }) => ({
        ...rest,
        cnf: {
          jwk: walletInstancePublicKey,
        },
        iss: removeTrailingSlash(iss),
        sub: removeTrailingSlash(sub),
        vct: `${trustAnchorUrl.href}vct/v1.0.0/WalletAttestation`,
      }),
      (sdJwtModel) =>
        pipe(
          {
            walletLink: sdJwtModel.walletLink,
            walletName: sdJwtModel.walletName,
          },
          getDisclosures,
          TE.fromIOEither,
          TE.map((disclosures) =>
            pipe(sdJwtModel, ({ aal, cnf, iss, sub, vct }) => ({
              claims: {
                _sd: disclosures.map(createHashBase64url),
                _sd_alg: "sha-256",
                aal,
                cnf,
                iss,
                sub,
                vct,
              },
              disclosures,
            })),
          ),
        ),
    );
