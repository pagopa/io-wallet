import { CdnManagementClient } from "@azure/arm-cdn";
import { ContainerClient } from "@azure/storage-blob";
import * as H from "@pagopa/handler-kit";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECPublicKeyWithKid } from "io-wallet-common/jwk";

import { EntityConfigurationV2ToJwtModel } from "@/encoders/entity-configuration";
import { FederationEntityMetadata } from "@/entity-configuration";
import { TrustMarkRepository } from "@/infra/azure/cosmos/trust-mark";
import { uploadFile } from "@/infra/azure/storage/blob";
import { signJwt, SignJwtEnvironment } from "@/infra/crypto/signer";
import { sendTelemetryException } from "@/infra/telemetry";
import { getKey, KeyRepository } from "@/keys";

interface EntityConfigurationV2Environment extends SignJwtEnvironment {
  containerClient: ContainerClient;
  entityConfigurationProperties: {
    authorityHints: UrlFromString[];
    federationEntity: FederationEntityMetadata & {
      basePath: UrlFromString;
    };
    walletSolution: {
      authorizationEndpoint: UrlFromString;
      credentialOfferEndpoint: UrlFromString;
      logoUri: UrlFromString;
      walletName: string;
    };
  };
  intermediatePublishedKeyNames: readonly string[];
  intermediateSigningKeyName: string;
  keyRepository: KeyRepository;
  leafPublishedKeyNames: readonly string[];
  trustAnchorUrl: UrlFromString;
  trustMarkRepository: TrustMarkRepository;
}

const withX5c = ({
  certificateChain,
  ...jwk
}: ECPublicKeyWithKid & { certificateChain: string[] }) => ({
  ...jwk,
  x5c: certificateChain,
});

const createEntityConfiguration: RTE.ReaderTaskEither<
  EntityConfigurationV2Environment,
  Error,
  string
> = ({
  cryptographyClient,
  entityConfigurationProperties: {
    authorityHints,
    federationEntity: { basePath, ...federationEntityMetadata },
    walletSolution,
  },
  intermediatePublishedKeyNames,
  intermediateSigningKeyName,
  keyRepository,
  leafPublishedKeyNames,
  trustAnchorUrl,
  trustMarkRepository,
}) =>
  pipe(
    TE.Do,
    TE.bind("intermediatePublishedKeys", () =>
      pipe(
        intermediatePublishedKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
    ),
    TE.bind("leafPublishedKeys", () =>
      pipe(
        leafPublishedKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
    ),
    TE.bind("trustMarks", () => trustMarkRepository.listTrustMarks),
    TE.chain(({ intermediatePublishedKeys, leafPublishedKeys, trustMarks }) =>
      pipe(
        intermediatePublishedKeys.find(
          ({ keyName }) => keyName === intermediateSigningKeyName,
        ),
        TE.fromNullable(
          new Error(
            `Intermediate signing key "${intermediateSigningKeyName}" not found in published keys`,
          ),
        ),
        TE.chain((intermediateSigningKey) =>
          pipe(
            {
              authorityHints,
              federationEntityMetadata: {
                contacts: federationEntityMetadata.contacts,
                homepageUri: federationEntityMetadata.homepageUri,
                logoUri: federationEntityMetadata.logoUri,
                organizationName: federationEntityMetadata.organizationName,
                policyUri: federationEntityMetadata.policyUri,
                tosUri: federationEntityMetadata.tosUri,
              },
              iss: basePath,
              jwks: intermediatePublishedKeys.map(withX5c),
              sub: basePath,
              trustMarks: trustMarks.map(({ id, trustMark }) => ({
                trustMark,
                trustMarkType: `${trustAnchorUrl.href.replace(/\/$/, "")}/trust_marks/federation-entity/${id}`,
              })),
              walletSolutionMetadata: {
                ...walletSolution,
                jwks: leafPublishedKeys.map(withX5c),
              },
            },
            EntityConfigurationV2ToJwtModel.encode,
            (payload) =>
              signJwt({
                crv: intermediateSigningKey.crv,
                duration: 24 * 60 * 60,
                header: {
                  kid: intermediateSigningKey.kid,
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
