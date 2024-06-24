import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";
import * as t from "io-ts";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

import { WalletAttestationToJwtModel } from "./encoders/wallet-attestation";
import {
  EntityConfigurationEnvironment,
  FederationEntity,
  getEntityConfiguration,
} from "./entity-configuration";
import { EidasTrustAnchor } from "./infra/trust-anchor";
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

const composeTrustChain = ({
  federationEntityMetadata,
  signer,
}: EntityConfigurationEnvironment) => {
  const walletProviderEntityStatement = pipe(
    new EidasTrustAnchor(federationEntityMetadata),
    (ta) => ta.getEntityStatement(),
    TE.map(({ encoded }) => encoded),
  );

  const walletProviderEntityConfiguration = getEntityConfiguration({
    federationEntityMetadata,
    signer,
  });

  return pipe(
    sequenceT(TE.ApplicativePar)(
      walletProviderEntityConfiguration,
      walletProviderEntityStatement,
    ),
  );
};

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
        trustChain: composeTrustChain({ federationEntityMetadata, signer }),
      }),
      TE.chain(({ publicJwk, supportedSignAlgorithms, trustChain }) =>
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
              trustAnchorUri: federationEntityMetadata.trustAnchorUri,
            },
            iss: federationEntityMetadata.basePath.href,
            sub: attestationRequest.header.kid,
            walletInstancePublicKey: attestationRequest.payload.cnf.jwk,
          },
          WalletAttestationToJwtModel.encode,
          signer.createJwtAndSign(
            {
              trust_chain: trustChain,
              typ: "wallet-attestation+jwt",
            },
            publicJwk.kid,
            "ES256",
            "1h",
          ),
        ),
      ),
    );
