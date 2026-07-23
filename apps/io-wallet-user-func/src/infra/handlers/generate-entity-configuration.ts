import { CdnManagementClient } from "@azure/arm-cdn";
import * as H from "@pagopa/handler-kit";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECKeyWithKid } from "io-wallet-common/jwk";

import { EntityConfigurationToJwtModel } from "@/encoders/entity-configuration";
import { EntityConfigurationEnvironment } from "@/entity-configuration";
import { uploadFile } from "@/infra/azure/storage/blob";
import { signJwt } from "@/infra/crypto/signer";
import { sendTelemetryException } from "@/infra/telemetry";
import { getKey } from "@/keys";
import { getLoAUri, LoA } from "@/wallet-provider";

const withX5c = ({
  certificateChain,
  ...jwk
}: ECKeyWithKid & { certificateChain: string[] }) => ({
  ...jwk,
  x5c: certificateChain,
});

// Create the JWT payload for the entity configuration metadata and return the signed JWT
const createEntityConfiguration: RTE.ReaderTaskEither<
  EntityConfigurationEnvironment,
  Error,
  string
> = ({
  cryptographyClient,
  entityConfiguration: {
    authorityHints,
    federationEntity: { basePathV10: basePath, ...federationEntityMetadata },
  },
  intermediatePublishedKeyNames,
  intermediateSigningKeyName,
  keyRepository,
  leafPublishedKeyNames,
}) =>
  pipe(
    sequenceS(TE.ApplyPar)({
      intermediatePublishedKeys: pipe(
        intermediatePublishedKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
      leafPublishedKeys: pipe(
        leafPublishedKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
    }),
    TE.chain(({ intermediatePublishedKeys, leafPublishedKeys }) =>
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
                jwks: leafPublishedKeys.map(withX5c),
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

export const GenerateEntityConfigurationHandler = H.of(() =>
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
