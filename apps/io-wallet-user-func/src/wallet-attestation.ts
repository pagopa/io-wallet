import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as t from "io-ts";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

import {
  WalletAttestationToJwtModel,
  WalletAttestationToJwtModelV2,
  WalletAttestationToSdJwtModel,
} from "./encoders/wallet-attestation";
import {
  EntityConfigurationEnvironment,
  FederationEntityMetadata,
} from "./entity-configuration";
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

// crea la wallet attestation in formato jwt
export const createWalletAttestationJwt =
  (
    attestationRequest: WalletAttestationRequestV2,
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
      }),
      TE.chain(({ publicJwk }) =>
        pipe(
          {
            aal: pipe(basePath, getLoAUri(LoA.basic)),
            iss: basePath.href,
            sub: attestationRequest.header.kid,
            walletInstancePublicKey: attestationRequest.payload.cnf.jwk,
          },
          WalletAttestationToJwtModelV2.encode,
          signer.createJwtAndSign(
            {
              typ: "oauth-client-attestation+jwt",
            },
            publicJwk.kid,
            "ES256",
            "1h",
          ),
        ),
      ),
    );

// crea la wallet attestation in formato sd-jwt
export const createWalletAttestationSdJwt =
  (
    assertion: WalletAttestationRequestV2,
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
      }),
      TE.chain(({ publicJwk }) =>
        pipe(
          {
            aal: pipe(basePath, getLoAUri(LoA.basic)), // basic?
            iss: basePath.href,
            sub: assertion.header.kid,
            walletInstancePublicKey: assertion.payload.cnf.jwk,
          },
          WalletAttestationToSdJwtModel.encode,
          signer.createJwtAndSign(
            {
              typ: "dc+sd-jwt",
            },
            publicJwk.kid,
            "ES256",
            "1h",
          ),
        ),
      ),
    );
