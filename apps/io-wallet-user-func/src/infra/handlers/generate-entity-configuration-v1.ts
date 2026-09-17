import { CdnManagementClient } from "@azure/arm-cdn";
import { ContainerClient } from "@azure/storage-blob";
import * as H from "@pagopa/handler-kit";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECPrivateKeyWithKid, ECPublicKeyWithKid } from "io-wallet-common/jwk";

import { EntityConfigurationToJwtModel } from "@/encoders/entity-configuration";
import { FederationEntityMetadata } from "@/entity-configuration";
import { uploadFile } from "@/infra/azure/storage/blob";
import { signJwt, SignJwtEnvironment } from "@/infra/crypto/signer";
import { sendTelemetryException } from "@/infra/telemetry";
import { getKey, KeyRepository } from "@/keys";
import { getLoAUri, LoA } from "@/wallet-provider";

interface EntityConfigurationV1Environment extends SignJwtEnvironment {
  containerClient: ContainerClient;
  entityConfigurationProperties: {
    authorityHints: UrlFromString[];
    federationEntity: FederationEntityMetadata & {
      basePath: UrlFromString;
    };
  };
  intermediatePublishedKeyNames: readonly string[];
  intermediateSigningKeyName: string;
  keyRepository: KeyRepository;
  walletAttestationSigningKeys: readonly ECPrivateKeyWithKid[];
}

const withX5c = ({
  certificateChain,
  ...jwk
}: ECPublicKeyWithKid & { certificateChain: string[] }) => ({
  ...jwk,
  x5c: certificateChain,
});

// Create the JWT payload for the entity configuration metadata and return the signed JWT
const createEntityConfiguration: RTE.ReaderTaskEither<
  EntityConfigurationV1Environment,
  Error,
  string
> = ({
  cryptographyClient,
  entityConfigurationProperties: {
    authorityHints,
    federationEntity: { basePath, ...federationEntityMetadata },
  },
  intermediatePublishedKeyNames,
  intermediateSigningKeyName,
  keyRepository,
  walletAttestationSigningKeys,
}) =>
  pipe(
    sequenceS(TE.ApplyPar)({
      intermediatePublishedKeys: pipe(
        intermediatePublishedKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
    }),
    TE.chain(({ intermediatePublishedKeys }) =>
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
              walletProviderMetadata: {
                ascValues: [
                  pipe(basePath, getLoAUri(LoA.basic)),
                  pipe(basePath, getLoAUri(LoA.medium)),
                  pipe(basePath, getLoAUri(LoA.high)),
                ],
                jwks: walletAttestationSigningKeys.map(
                  ({ d, ...publicKey }) => {
                    void d;
                    return publicKey;
                  },
                ),
              },
            },
            EntityConfigurationToJwtModel.encode,
            (payload) =>
              signJwt({
                // TODO: SIW-2656. env var are not used
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
            {
              contentPaths: ["/*"],
            },
          ),
        E.toError,
      ),
      TE.map(() => void 0),
    );

export const GenerateEntityConfigurationV1Handler = H.of(() =>
  pipe(
    createEntityConfiguration,
    RTE.chainW(uploadFile),
    RTE.chainW(purgeContent),
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "generateEntityConfiguration",
        }),
        RTE.fromEither,
      ),
    ),
  ),
);
