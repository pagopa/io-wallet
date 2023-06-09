import * as t from "io-ts";

import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";

import {
  EntityConfigurationEnvironment,
  FederationEntity,
} from "./entity-configuration";
import { verifyWalletInstanceAttestationRequest } from "./wallet-instance-attestation-request";
import { LoA, getLoAUri } from "./wallet-provider";
import { JwkPublicKey } from "./jwk";
import { WalletInstanceAttestationToJwtModel } from "./encoders/wallet-instance-attestation";

export const WalletInstanceAttestationPayload = t.type({
  iss: t.string,
  sub: t.string,
  type: t.literal("WalletInstanceAttestation"),
  federationEntity: FederationEntity,
  asc: t.string,
  publicJwk: JwkPublicKey,
  algValueSupported: t.array(t.string),
});

export type WalletInstanceAttestationPayload = t.TypeOf<
  typeof WalletInstanceAttestationPayload
>;

// Build the JWT of the Wallet Instance Attestation given a Wallet Instance Attestation Request
export const createWalletInstanceAttestation =
  (
    walletInstanceAttestationRequest: string
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
    pipe(
      sequenceS(TE.ApplicativePar)({
        request: pipe(
          walletInstanceAttestationRequest,
          verifyWalletInstanceAttestationRequest
        ),
        publicJwk: pipe(signer.getFirstPublicKeyByKty("EC"), TE.fromEither),
        supportedSignAlgorithms: pipe(
          signer.getSupportedSignAlgorithms(),
          TE.fromEither
        ),
      }),
      TE.chain(({ request, publicJwk, supportedSignAlgorithms }) =>
        pipe(
          {
            iss: federationEntityMetadata.basePath.href,
            sub: request.header.kid,
            type: "WalletInstanceAttestation",
            federationEntity: {
              organizationName: federationEntityMetadata.organizationName,
              homepageUri: federationEntityMetadata.homePageUri.href,
              policyUri: federationEntityMetadata.policyUri.href,
              tosUri: federationEntityMetadata.tosUri.href,
              logoUri: federationEntityMetadata.logoUri.href,
            },
            asc: pipe(federationEntityMetadata.basePath, getLoAUri(LoA.basic)),
            publicJwk,
            algValueSupported: supportedSignAlgorithms,
          },
          WalletInstanceAttestationToJwtModel.encode,
          signer.createJwtAndsign({ typ: "va+jwt", x5c: [] }, publicJwk.kid)
        )
      )
    );
