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
    jwksKeyNames: string[];
    metadata: {
      federationEntity: {
        contacts: EmailString[];
        homepageUri: UrlFromString;
        logoUri: UrlFromString;
        organizationName: NonEmptyString;
        policyUri: UrlFromString;
        tosUri: UrlFromString;
      };
      walletProviderJwks: ECPublicKeyWithKid[];
    };
    signingKeyName: string;
    trustAnchorUrl: UrlFromString;
  };
  keyRepository: KeyRepository;
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
  entityConfigurationJwt: {
    federationEntityId,
    jwksKeyNames,
    metadata: {
      federationEntity: federationEntityMetadata,
      walletProviderJwks,
    },
    signingKeyName,
    trustAnchorUrl,
  },
  keyRepository,
}) =>
  pipe(
    getKey(signingKeyName)({ keyRepository }),
    TE.chain((signingKey) =>
      pipe(
        sequenceS(TE.ApplyPar)({
          jwksWithX5c: pipe(
            jwksKeyNames,
            TE.traverseArray((kid) => getKey(kid)({ keyRepository })),
            TE.map((keys) => keys.map(withX5c)),
          ),
          walletProviderJwksWithX5c: pipe(
            walletProviderJwks,
            TE.traverseArray((jwk) => getKey(jwk.kid)({ keyRepository })),
            TE.map((keys) => keys.map(withX5c)),
          ),
        }),
        TE.chain(({ jwksWithX5c, walletProviderJwksWithX5c }) =>
          pipe(
            {
              authorityHints: [trustAnchorUrl],
              federationEntityMetadata,
              iss: federationEntityId,
              jwks: jwksWithX5c,
              sub: federationEntityId,
              walletProviderMetadata: {
                ascValues: [
                  pipe(federationEntityId, getLoAUri(LoA.basic)),
                  pipe(federationEntityId, getLoAUri(LoA.medium)),
                  pipe(federationEntityId, getLoAUri(LoA.high)),
                ],
                jwks: walletProviderJwksWithX5c,
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
