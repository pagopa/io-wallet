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

import { EntityConfigurationToJwtModel } from "@/encoders/entity-configuration";
import { uploadFile } from "@/infra/azure/storage/blob";
import { signJwt, SignJwtEnvironment } from "@/infra/crypto/signer";
import { sendTelemetryException } from "@/infra/telemetry";
import { getKey, KeyRepository } from "@/keys";
import { getLoAUri, LoA } from "@/wallet-provider";

interface EntityConfigurationV1Environment extends SignJwtEnvironment {
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
      walletProviderJwksKeyNames: string[];
    };
    signingKeyName: string;
    trustAnchorUrl: UrlFromString;
  };
  keyRepository: KeyRepository;
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
  EntityConfigurationV1Environment,
  Error,
  string
> = ({
  cryptographyClient,
  entityConfigurationJwt: {
    federationEntityId,
    federationEntityJwksKeyNames,
    metadata: {
      federationEntity: federationEntityMetadata,
      walletProviderJwksKeyNames,
    },
    signingKeyName,
    trustAnchorUrl,
  },
  keyRepository,
}) =>
  pipe(
    sequenceS(TE.ApplyPar)({
      federationEntityJwks: pipe(
        federationEntityJwksKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
      walletProviderJwks: pipe(
        walletProviderJwksKeyNames,
        TE.traverseArray((keyName) => getKey(keyName)({ keyRepository })),
      ),
    }),
    TE.chainW(({ federationEntityJwks, walletProviderJwks }) =>
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
              federationEntityMetadata,
              iss: federationEntityId,
              jwks: federationEntityJwks.map(withX5c),
              sub: federationEntityId,
              walletProviderMetadata: {
                ascValues: [
                  pipe(federationEntityId, getLoAUri(LoA.basic)),
                  pipe(federationEntityId, getLoAUri(LoA.medium)),
                  pipe(federationEntityId, getLoAUri(LoA.high)),
                ],
                jwks: walletProviderJwks.map(withX5c),
              },
            },
            EntityConfigurationToJwtModel.encode,
            (payload) =>
              // TODO: SIW-2656. env var are not used
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
