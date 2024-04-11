import * as t from "io-ts";

import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";

import {
  EntityConfigurationEnvironment,
  FederationEntity,
  getEntityConfiguration,
} from "./entity-configuration";
import { verifyWalletAttestationRequest } from "./wallet-attestation-request";
import { LoA, getLoAUri } from "./wallet-provider";
import { JwkPublicKey } from "./jwk";
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

  const walletProviderEntityConfiguration = getEntityConfiguration()({
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
    walletAttestationRequest: string
  ): RTE.ReaderTaskEither<EntityConfigurationEnvironment, Error, string> =>
  ({ federationEntityMetadata, signer }) =>
    pipe(
      sequenceS(TE.ApplicativePar)({
        request: pipe(walletAttestationRequest, verifyWalletAttestationRequest),
        publicJwk: pipe(signer.getFirstPublicKeyByKty("EC"), TE.fromEither),
        supportedSignAlgorithms: pipe(
          signer.getSupportedSignAlgorithms(),
          TE.fromEither
        ),
        trustChain: composeTrustChain({ federationEntityMetadata, signer }),
      }),
      TE.chain(({ request, publicJwk, supportedSignAlgorithms, trustChain }) =>
        pipe(
          {
            iss: federationEntityMetadata.basePath.href,
            sub: request.header.kid,
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
            walletInstancePublicKey: request.payload.cnf.jwk,
            algValueSupported: supportedSignAlgorithms,
          },
          WalletAttestationToJwtModel.encode,
          signer.createJwtAndsign(
            { typ: "wallet-attestation+jwt", x5c: [], trust_chain: trustChain },
            publicJwk.kid
          )
        )
      )
    );
