import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";

import { WalletAttestationData } from "./encoders/wallet-attestation";
import { FederationEntity } from "./entity-configuration";
import { WalletAttestationRequest } from "./wallet-attestation-request";
import { getLoAUri, LoA } from "./wallet-provider";

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
