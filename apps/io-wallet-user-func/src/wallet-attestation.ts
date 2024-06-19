import * as t from "io-ts";

import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";

import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";
import {
  EntityConfigurationEnvironment,
  FederationEntity,
  getEntityConfiguration,
} from "./entity-configuration";
import { WalletAttestationRequest } from "./wallet-attestation-request";
import { LoA, getLoAUri } from "./wallet-provider";
import { WalletAttestationToJwtModel } from "./encoders/wallet-attestation";
import { EidasTrustAnchor } from "./infra/trust-anchor";

export const WalletAttestationPayload = t.type({
  iss: t.string,
  sub: t.string,
  federationEntity: FederationEntity,
  attested_security_context: t.string,
  walletInstancePublicKey: JwkPublicKey,
  algValueSupported: t.array(t.string),
});

export type WalletAttestationPayload = t.TypeOf<
  typeof WalletAttestationPayload
>;

const composeTrustChain = ({
  federationEntityMetadata,
  signer,
}: EntityConfigurationEnvironment) => {
  const walletProviderEntityStatement = pipe(
    new EidasTrustAnchor(federationEntityMetadata),
    (ta) => ta.getEntityStatement(),
    TE.map(({ encoded }) => encoded)
  );

  const walletProviderEntityConfiguration = getEntityConfiguration({
    federationEntityMetadata,
    signer,
  });

  return pipe(
    sequenceT(TE.ApplicativePar)(
      walletProviderEntityConfiguration,
      walletProviderEntityStatement
    )
  );
};

// Build the JWT of the Wallet Attestation given a Wallet Attestation Request
export const createWalletAttestation =
  (
    attestationRequest: WalletAttestationRequest
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
    pipe(
      sequenceS(TE.ApplicativePar)({
        publicJwk: pipe(
          signer.getFirstPublicKeyByKty("EC"),
          E.chainW(validateJwkKid),
          TE.fromEither
        ),
        supportedSignAlgorithms: pipe(
          signer.getSupportedSignAlgorithms(),
          TE.fromEither
        ),
        trustChain: composeTrustChain({ federationEntityMetadata, signer }),
      }),
      TE.chain(({ publicJwk, supportedSignAlgorithms, trustChain }) =>
        pipe(
          {
            iss: federationEntityMetadata.basePath.href,
            sub: attestationRequest.header.kid,
            federationEntity: {
              organizationName: federationEntityMetadata.organizationName,
              homepageUri: federationEntityMetadata.homePageUri,
              policyUri: federationEntityMetadata.policyUri,
              tosUri: federationEntityMetadata.tosUri,
              logoUri: federationEntityMetadata.logoUri,
              trustAnchorUri: federationEntityMetadata.trustAnchorUri,
            },
            attested_security_context: pipe(
              federationEntityMetadata.basePath,
              getLoAUri(LoA.basic)
            ),
            walletInstancePublicKey: attestationRequest.payload.cnf.jwk,
            algValueSupported: supportedSignAlgorithms,
          },
          WalletAttestationToJwtModel.encode,
          signer.createJwtAndSign(
            {
              typ: "wallet-attestation+jwt",
              x5c: [],
              trust_chain: trustChain,
            },
            publicJwk.kid,
            "ES256",
            "1h"
          )
        )
      )
    );
