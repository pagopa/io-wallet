import crypto from "crypto";
import * as E from "fp-ts/Either";
import * as IOE from "fp-ts/IOEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";
import * as t from "io-ts";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

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
import { Signer } from "./signer";
import { removeTrailingSlash } from "./url";
import {
  WalletAttestationRequest,
  WalletAttestationRequestV2,
} from "./wallet-attestation-request";
import { LoA, getLoAUri } from "./wallet-provider";

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
    signer,
  }) =>
    pipe(
      sequenceS(TE.ApplicativePar)({
        publicJwk: pipe(
          signer.getFirstPublicKeyByKty("EC"),
          E.chainW(validateJwkKid),
          TE.fromEither,
        ),
        supportedSignAlgorithms: pipe(
          signer.getSupportedSignAlgorithms(),
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
          signer.createJwtAndSign(
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
interface WalletAttestationConfig {
  walletLink: string;
  walletName: string;
}

interface WalletAttestationEnvironment {
  federationEntity: FederationEntity;
  signer: Signer;
  walletAttestationConfig: WalletAttestationConfig;
}

const getWalletAttestationData =
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
        trustChain: [],
        walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
        walletLink,
        walletName,
      })),
    );

export const createWalletAttestationAsJwt =
  (
    walletAttestationRequest: WalletAttestationRequestV2,
  ): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  (dep) =>
    pipe(
      dep,
      getWalletAttestationData(walletAttestationRequest),
      TE.chain(
        flow(
          WalletAttestationToJwtModelV2.encode,
          ({ kid, trust_chain, ...payload }) =>
            dep.signer.createJwtAndSign(
              {
                trust_chain,
                typ: "oauth-client-attestation+jwt",
              },
              kid,
              "ES256",
              "1h",
            )(payload),
        ),
      ),
    );

const generateSalt: IOE.IOEither<Error, string> = IOE.tryCatch(
  () => crypto.randomBytes(16).toString("hex"),
  (error) => new Error(`Failed to generate salt: ${error}`),
);

const disclosureToBase64 = (disclosure: [string, string, unknown]): string =>
  pipe(disclosure, JSON.stringify, (str) =>
    Buffer.from(str).toString("base64"),
  );

const getDisclosures = ({
  walletLink,
  walletName,
}: {
  walletLink: string;
  walletName: string;
}): IOE.IOEither<Error, [string, string]> =>
  pipe(
    sequenceT(IOE.ApplicativePar)(generateSalt, generateSalt),
    IOE.map(([nameSalt, linkSalt]) => [
      disclosureToBase64([nameSalt, "wallet_name", walletName]),
      disclosureToBase64([linkSalt, "wallet_link", walletLink]),
    ]),
  );

const hashToBase64 = (input: string): string =>
  crypto
    .createHash("sha256")
    .update(Buffer.from(input, "base64"))
    .digest("base64");

export const createWalletAttestationAsSdJwt =
  (
    walletAttestationRequest: WalletAttestationRequestV2,
  ): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  (environment) =>
    pipe(
      environment,
      getWalletAttestationData(walletAttestationRequest),
      TE.map(({ iss, sub, walletInstancePublicKey, ...rest }) => ({
        ...rest,
        cnf: {
          jwk: walletInstancePublicKey,
        },
        iss: removeTrailingSlash(iss),
        sub: removeTrailingSlash(sub),
        vct: "wallet.attestation.example/v1.0",
      })),
      TE.chain((sdJwtModel) =>
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
                _sd: disclosures.map(hashToBase64),
                aal,
                cnf,
                iss,
                sd_alg: "sha-256",
                sub,
                vct,
              }),
              environment.signer.createJwtAndSign(
                {
                  trust_chain: sdJwtModel.trustChain,
                  typ: "oauth-client-attestation+jwt",
                },
                sdJwtModel.kid,
                "ES256",
                "1h",
              ),
              TE.map((jwt) =>
                pipe(disclosures, (base64Disclosures) =>
                  [jwt, ...base64Disclosures].join("~"),
                ),
              ),
            ),
          ),
        ),
      ),
    );

// export declare const createWalletAttestationAsMdoc: (
//   walletAttestationRequest: WalletAttestationRequestV2,
// ) => RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string>;
