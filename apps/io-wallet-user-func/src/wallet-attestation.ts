import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as t from "io-ts";

import { WalletAttestationToJwtModel } from "./encoders/wallet-attestation";
import {
  EntityConfigurationEnvironment,
  FederationEntity,
} from "./entity-configuration";
import { JwkPublicKey, validateJwkKid } from "./jwk";
import { WalletAttestationRequest } from "./wallet-attestation-request";
import { LoA, getLoAUri } from "./wallet-provider";

export const WalletAttestationPayload = t.type({
  aal: t.string,
  algValueSupported: t.array(t.string),
  federationEntity: FederationEntity,
  iss: t.string,
  sub: t.string,
  walletInstancePublicKey: JwkPublicKey,
});

export type WalletAttestationPayload = t.TypeOf<
  typeof WalletAttestationPayload
>;

// Build the JWT of the Wallet Attestation given a Wallet Attestation Request
export const createWalletAttestation =
  (
    attestationRequest: WalletAttestationRequest,
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
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
            aal: pipe(federationEntityMetadata.basePath, getLoAUri(LoA.basic)),
            algValueSupported: supportedSignAlgorithms,
            federationEntity: {
              homepageUri: federationEntityMetadata.homePageUri,
              logoUri: federationEntityMetadata.logoUri,
              organizationName: federationEntityMetadata.organizationName,
              policyUri: federationEntityMetadata.policyUri,
              tosUri: federationEntityMetadata.tosUri,
            },
            iss: federationEntityMetadata.basePath.href,
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
