import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as IOE from "fp-ts/IOEither";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

import { CertificateRepository } from "./certificates";
import {
  WalletAttestationData,
  WalletAttestationToJwtModel,
  WalletAttestationToJwtModelV2,
} from "./encoders/wallet-attestation";
import {
  EntityConfigurationEnvironment,
  FederationEntity,
  FederationEntityMetadata,
} from "./entity-configuration";
import { createHashBase64url } from "./infra/crypto/hashing";
import { generateRandomHex } from "./infra/crypto/random";
import { Signer } from "./signer";
import { removeTrailingSlash } from "./url";
import {
  WalletAttestationRequest,
  WalletAttestationRequestV2,
} from "./wallet-attestation-request";
import { getLoAUri, LoA } from "./wallet-provider";

const disclosureToBase64Url = (disclosure: [string, string, unknown]): string =>
  pipe(disclosure, JSON.stringify, (str) =>
    Buffer.from(str).toString("base64url"),
  );

export const WalletAttestationPayload = t.type({
  aal: t.string,
  algValueSupported: t.array(t.string),
  federationEntity: FederationEntityMetadata,
  iss: t.string,
  sub: t.string,
  walletInstancePublicKey: JwkPublicKey,
});

export type WalletAttestationPayload = t.TypeOf<
  typeof WalletAttestationPayload
>;

// Build the JWT Wallet Attestation given a Wallet Attestation Request
export const createWalletAttestation =
  (
    attestationRequest: WalletAttestationRequest,
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({
    entityConfiguration: {
      federationEntity: { basePath, ...federationEntityMetadata },
    },
    walletAttestationSigner,
  }) =>
    pipe(
      sequenceS(TE.ApplicativePar)({
        publicJwk: pipe(
          walletAttestationSigner.getFirstPublicKeyByKty("EC"),
          E.chainW(validateJwkKid),
          TE.fromEither,
        ),
        supportedSignAlgorithms: pipe(
          walletAttestationSigner.getSupportedSignAlgorithms(),
          TE.fromEither,
        ),
      }),
      TE.chain(({ publicJwk, supportedSignAlgorithms }) =>
        pipe(
          {
            aal: pipe(basePath, getLoAUri(LoA.basic)),
            algValueSupported: supportedSignAlgorithms,
            federationEntity: {
              contacts: federationEntityMetadata.contacts,
              homepageUri: federationEntityMetadata.homepageUri,
              logoUri: federationEntityMetadata.logoUri,
              organizationName: federationEntityMetadata.organizationName,
              policyUri: federationEntityMetadata.policyUri,
              tosUri: federationEntityMetadata.tosUri,
            },
            iss: basePath.href,
            sub: attestationRequest.header.kid,
            walletInstancePublicKey: attestationRequest.payload.cnf.jwk,
          },
          WalletAttestationToJwtModel.encode,
          walletAttestationSigner.createJwtAndSign(
            {
              typ: "wallet-attestation+jwt",
            },
            publicJwk.kid,
            "ES256",
            "1h",
          ),
        ),
      ),
    );

// ----- new wallet-attestation endpoint

export interface WalletAttestationEnvironment {
  certificateRepository: CertificateRepository;
  federationEntity: FederationEntity;
  signer: Signer;
  walletAttestationConfig: WalletAttestationConfig;
}

interface WalletAttestationConfig {
  trustAnchorUrl: ValidUrl;
  walletLink: string;
  walletName: string;
}

export const getWalletAttestationData =
  (
    walletAttestationRequest: WalletAttestationRequestV2,
  ): RTE.ReaderTaskEither<
    WalletAttestationEnvironment,
    Error,
    WalletAttestationData
  > =>
  ({
    federationEntity: { basePath },
    signer,
    walletAttestationConfig: { walletLink, walletName },
  }) =>
    pipe(
      "EC",
      signer.getFirstPublicKeyByKty,
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.map(({ kid }) => ({
        aal: pipe(basePath, getLoAUri(LoA.basic)),
        iss: basePath.href,
        kid,
        sub: walletAttestationRequest.header.kid,
        walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
        walletLink,
        walletName,
      })),
    );

export const createWalletAttestationAsJwt =
  (
    walletAttestationData: WalletAttestationData,
  ): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  (dep) =>
    pipe(
      walletAttestationData,
      WalletAttestationToJwtModelV2.encode,
      ({ kid, ...payload }) =>
        dep.signer.createJwtAndSign(
          {
            typ: "oauth-client-attestation+jwt",
          },
          kid,
          "ES256",
          "1h",
        )(payload),
    );

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

export const createWalletAttestationAsSdJwt =
  (
    walletAttestationData: WalletAttestationData,
  ): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  ({ signer, walletAttestationConfig: { trustAnchorUrl } }) =>
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
          TE.chain((disclosures) =>
            pipe(
              sdJwtModel,
              ({ aal, cnf, iss, sub, vct }) => ({
                _sd: disclosures.map(createHashBase64url),
                _sd_alg: "sha-256",
                aal,
                cnf,
                iss,
                sub,
                vct,
              }),
              signer.createJwtAndSign(
                {
                  typ: "dc+sd-jwt",
                },
                sdJwtModel.kid,
                "ES256",
                "1h",
                // TODO: SIW-2656. env var are not used
              ),
              TE.map((jwt) =>
                pipe(disclosures, (base64Disclosures) =>
                  [jwt, ...base64Disclosures].join("~"),
                ),
              ),
            ),
          ),
        ),
    );
