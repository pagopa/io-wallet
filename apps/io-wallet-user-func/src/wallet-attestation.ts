import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as t from "io-ts";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

import {
  WalletAttestationData,
  WalletAttestationToJwtModel,
  WalletAttestationToJwtModelV2,
  WalletAttestationToSdJwtModel,
  // WalletAttestationToSdJwtModel,
} from "./encoders/wallet-attestation";
import {
  EntityConfigurationEnvironment,
  FederationEntity,
  FederationEntityMetadata,
} from "./entity-configuration";
import { Signer } from "./signer";
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
            aal: pipe(basePath, getLoAUri(LoA.basic)), // basic?
            algValueSupported: supportedSignAlgorithms,
            federationEntity: {
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
interface WalletProvider {
  walletLink: string;
  walletName: string;
}

interface WalletAttestationEnvironment {
  federationEntity: FederationEntity;
  signer: Signer;
  walletProvider: WalletProvider;
}

export const createWalletAttestationAsJwt =
  (
    walletAttestationRequest: WalletAttestationRequestV2,
  ): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  (dep) =>
    // pipe(
    //   signer.getFirstPublicKeyByKty("EC"),
    //   E.chainW(validateJwkKid),
    //   TE.fromEither,
    //   TE.chain(({ kid }) =>
    //     pipe(
    //       {
    //         aal: pipe(basePath, getLoAUri(LoA.basic)),
    //         iss: basePath.href,
    //         sub: walletAttestationRequest.header.kid,
    //         walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
    //         walletLink,
    //         walletName,
    //       },
    //       WalletAttestationToJwtModelV2.encode,
    //       signer.createJwtAndSign(
    //         {
    //           trust_chain: [],
    //           typ: "oauth-client-attestation+jwt",
    //         },
    //         kid,
    //         "ES256",
    //         "1h",
    //       ),
    //     ),
    //   ),
    // );
    pipe(
      dep,
      getWalletAttestationClaims(walletAttestationRequest),
      TE.chain(
        flow(WalletAttestationToJwtModelV2.encode, (x) =>
          dep.signer.createJwtAndSign(
            {
              trust_chain: [],
              typ: "oauth-client-attestation+jwt",
            },
            x.kid,
            "ES256",
            "1h",
          )(x),
        ),
      ),
    );

import crypto from "crypto";

// const disclosure1: [string, string, string] = [
//   "2973a05846572f3fe81d6204022198f3",
//   "wallet_name",
//   "IT Wallet",
// ];

// // TODO
// const hashDisclosure = (disclosure: [string, string, unknown]) => {
//   const jsonStr = JSON.stringify(disclosure);
//   const base64Encoded = Buffer.from(jsonStr).toString("base64url");
//   return crypto.createHash("sha256").update(base64Encoded).digest("base64url");
// };

const getWalletAttestationClaims =
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
    walletProvider: { walletLink, walletName },
  }) =>
    pipe(
      signer.getFirstPublicKeyByKty("EC"),
      E.chainW(validateJwkKid),
      TE.fromEither,
      TE.map(({ kid }) => ({
        kid,
        aal: pipe(basePath, getLoAUri(LoA.basic)),
        iss: basePath.href,
        sub: walletAttestationRequest.header.kid,
        walletInstancePublicKey: walletAttestationRequest.payload.cnf.jwk,
        walletLink,
        walletName,
      })),
    );

import * as IOE from "fp-ts/IOEither";

const generateSalt: IOE.IOEither<Error, string> = IOE.tryCatch(
  () => crypto.randomBytes(16).toString("hex"),
  (error) => new Error(`Failed to generate salt: ${error}`),
);

const foo1 = (
  walletLink: string,
  walletName: string,
): IOE.IOEither<
  Error,
  [[string, string, unknown], [string, string, unknown]]
> => {
  return pipe(
    generateSalt,
    IOE.chain((salt1) =>
      pipe(
        generateSalt,
        IOE.map((salt2) => [
          [salt1, "wallet_name", walletName],
          [salt2, "wallet_link", walletLink],
        ]),
      ),
    ),
  );
};

// crea il JWT con tutti i claims
// trasforma in disclosure i claim che dovranno essere rivelabili selettivamente
// sostituisce questi claim con gli hash delle disclosure nel jwt
// firma l'intero jwt
// ritorna al client

const hashDisclosure = (disclosure: [string, string, unknown]): string =>
  pipe(
    disclosure,
    JSON.stringify,
    (jsonStr) => Buffer.from(jsonStr).toString("base64url"),
    (base64) => crypto.createHash("sha-256").update(base64).digest("base64url"),
  );

const disclosureToBase64 = (disclosure: [string, string, unknown]): string =>
  pipe(disclosure, JSON.stringify, (str) =>
    Buffer.from(str).toString("base64url"),
  );

export const createWalletAttestationAsSdJwt =
  (
    walletAttestationRequest: WalletAttestationRequestV2,
  ): RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> =>
  (dep) =>
    pipe(
      dep,
      getWalletAttestationClaims(walletAttestationRequest),
      TE.map(WalletAttestationToSdJwtModel.encode),
      TE.chain((encodedClaims) =>
        pipe(
          foo1(encodedClaims.wallet_link, encodedClaims.wallet_name),
          TE.fromIOEither,
          TE.map((disclosures) => [encodedClaims, disclosures] as const),
        ),
      ),
      TE.chain(([encodedClaims, disclosures]) =>
        pipe(
          {
            ...encodedClaims,
            wallet_link: undefined,
            wallet_name: undefined,
            sd_alg: "sha-256",
            _sd: disclosures.map(hashDisclosure),
          },
          (sdJwtClaims) =>
            dep.signer.createJwtAndSign(
              { trust_chain: [], typ: "oauth-client-attestation+jwt" },
              encodedClaims.kid,
              "ES256",
              "1h",
            )(sdJwtClaims),
          TE.map((jwt) =>
            pipe(
              disclosures,
              (ds) => ds.map(disclosureToBase64),
              (base64Disclosures) => [jwt, ...base64Disclosures].join("~"),
            ),
          ),
        ),
      ),
    );

export declare const createWalletAttestationAsMdoc: (
  walletAttestationRequest: WalletAttestationRequestV2,
) => RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string>;
