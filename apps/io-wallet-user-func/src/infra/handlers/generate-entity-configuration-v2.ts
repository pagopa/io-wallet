import { CdnManagementClient } from "@azure/arm-cdn";
import { ContainerClient } from "@azure/storage-blob";
import * as H from "@pagopa/handler-kit";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECPublicKeyWithKid } from "io-wallet-common/jwk";

import { EntityConfigurationV2ToJwtModel } from "@/encoders/entity-configuration";
import { TrustMarkRepository } from "@/infra/azure/cosmos/trust-mark";
import { uploadFile } from "@/infra/azure/storage/blob";
import { signJwt, SignJwtEnvironment } from "@/infra/crypto/signer";
import { sendTelemetryException } from "@/infra/telemetry";
import { getKey, KeyRepository } from "@/keys";

interface EntityConfigurationV2Environment extends SignJwtEnvironment {
  containerClient: ContainerClient;
  entityConfigurationJwt: {
    federationEntityId: UrlFromString;
    federationEntityJwksKeyNames: string[];
    metadata: {
      federationEntity: {
        contacts: EmailString[];
        homepageUri: UrlFromString;
        logoUri: UrlFromString;
        organizationName: NonEmptyString;
        policyUri: UrlFromString;
        tosUri: UrlFromString;
      };
      walletSolution: {
        jwksKeyNames: string[];
        logoUri: UrlFromString;
        walletMetadata: {
          authorizationEndpoint: UrlFromString;
          credentialOfferEndpoint: UrlFromString;
          walletName: string;
        };
      };
    };
    signingKeyName: string;
    trustAnchorUrl: UrlFromString;
  };
  keyRepository: KeyRepository;
  trustMarkRepository: TrustMarkRepository;
}

const withX5c = ({
  certificateChain,
  keyName,
  ...jwk
}: ECPublicKeyWithKid & { certificateChain: string[]; keyName: string }) => {
  void keyName;

  return {
    ...jwk,
    x5c: certificateChain,
  };
};

const createEntityConfiguration: RTE.ReaderTaskEither<
  EntityConfigurationV2Environment,
  Error,
  string
> = ({
  cryptographyClient,
  entityConfigurationJwt: {
    federationEntityId,
    federationEntityJwksKeyNames,
    metadata: {
      federationEntity: federationEntityMetadata,
      walletSolution: walletSolutionMetadata,
    },
    signingKeyName,
    trustAnchorUrl,
  },
  keyRepository,
  trustMarkRepository,
}) =>
  pipe(
    sequenceS(TE.ApplyPar)({
      federationEntityJwks: pipe(
        federationEntityJwksKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
      trustMarks: trustMarkRepository.listTrustMarks,
      walletSolutionJwks: pipe(
        walletSolutionMetadata.jwksKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
    }),
    TE.chainW(({ federationEntityJwks, trustMarks, walletSolutionJwks }) =>
      pipe(
        federationEntityJwks.find(({ keyName }) => keyName === signingKeyName),
        TE.fromNullable(
          new Error(
            `Intermediate signing key "${signingKeyName}" not found in published keys`,
          ),
        ),
        TE.chain((signingKey) =>
          pipe(
            {
              authorityHints: [trustAnchorUrl],
              federationEntityMetadata: {
                contacts: federationEntityMetadata.contacts,
                homepageUri: federationEntityMetadata.homepageUri,
                logoUri: federationEntityMetadata.logoUri,
                organizationName: federationEntityMetadata.organizationName,
                policyUri: federationEntityMetadata.policyUri,
                tosUri: federationEntityMetadata.tosUri,
              },
              iss: federationEntityId,
              jwks: federationEntityJwks.map(withX5c),
              sub: federationEntityId,
              trustMarks: trustMarks.map(({ id, trustMark }) => ({
                trustMark,
                trustMarkType: `${trustAnchorUrl.href.replace(/\/$/, "")}/trust_marks/federation-entity/${id}`,
              })),
              walletSolutionMetadata: {
                ...walletSolutionMetadata.walletMetadata,
                jwks: walletSolutionJwks.map(withX5c),
                logoUri: walletSolutionMetadata.logoUri,
              },
            },
            EntityConfigurationV2ToJwtModel.encode,
            (payload) =>
              signJwt({
                crv: signingKey.crv,
                duration: 24 * 60 * 60,
                header: {
                  kid: signingKey.kid,
                  typ: "entity-statement+jwt",
                },
                payload,
              })({ cryptographyClient }),
          ),
        ),
      ),
    ),
  );

const purgeContent: () => RTE.ReaderTaskEither<
  {
    cdnManagementClient: CdnManagementClient;
    endpointName: string;
    profileName: string;
    resourceGroupName: string;
  },
  Error,
  void
> =
  () =>
  ({ cdnManagementClient, endpointName, profileName, resourceGroupName }) =>
    pipe(
      TE.tryCatch(
        () =>
          cdnManagementClient.afdEndpoints.beginPurgeContent(
            resourceGroupName,
            profileName,
            endpointName,
            { contentPaths: ["/*"] },
          ),
        E.toError,
      ),
      TE.map(() => void 0),
    );

export const GenerateEntityConfigurationV2Handler = H.of(() =>
  pipe(
    createEntityConfiguration,
    RTE.chainW(uploadFile),
    RTE.chainW(purgeContent),
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "generateEntityConfigurationV2",
        }),
        RTE.fromEither,
      ),
    ),
  ),
);
