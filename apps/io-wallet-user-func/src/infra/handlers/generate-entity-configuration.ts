import { EntityConfigurationToJwtModel } from "@/encoders/entity-configuration";
import { EntityConfigurationEnvironment } from "@/entity-configuration";
import { LoA, getLoAUri } from "@/wallet-provider";
import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { validateJwkKid } from "io-wallet-common/jwk";

// Create the JWT payload for the entity configuration metadata and return the signed JWT
const createEntityConfiguration: RTE.ReaderTaskEither<
  { authorityHints: string[] } & EntityConfigurationEnvironment,
  Error,
  string
> = ({ authorityHints, federationEntityMetadata, signer }) =>
  pipe(
    sequenceS(E.Apply)({
      jwks: signer.getPublicKeys(),
      publicJwk: pipe(
        signer.getFirstPublicKeyByKty("EC"),
        E.chainW(validateJwkKid),
      ),
    }),
    TE.fromEither,
    TE.chain(({ jwks, publicJwk }) =>
      pipe(
        {
          authorityHints,
          federationEntity: {
            homepageUri: federationEntityMetadata.homePageUri,
            logoUri: federationEntityMetadata.logoUri,
            organizationName: federationEntityMetadata.organizationName,
            policyUri: federationEntityMetadata.policyUri,
            tosUri: federationEntityMetadata.tosUri,
          },
          iss: federationEntityMetadata.basePath,
          sub: federationEntityMetadata.basePath,
          walletProviderMetadata: {
            ascValues: [
              pipe(federationEntityMetadata.basePath, getLoAUri(LoA.basic)),
              pipe(federationEntityMetadata.basePath, getLoAUri(LoA.medium)),
              pipe(federationEntityMetadata.basePath, getLoAUri(LoA.hight)),
            ],
            jwks,
          },
        },
        EntityConfigurationToJwtModel.encode,
        signer.createJwtAndSign(
          { typ: "entity-statement+jwt" },
          publicJwk.kid,
          "ES256",
          "24h",
        ),
      ),
    ),
  );

import { ContainerClient } from "@azure/storage-blob";

const uploadFile: (
  // buffer: Buffer<ArrayBuffer>,
  data: string,
) => RTE.ReaderTaskEither<{ containerClient: ContainerClient }, never, void> =
  (data) =>
  ({ containerClient }) =>
    pipe(
      TE.tryCatch(
        () =>
          containerClient
            .getBlockBlobClient("openid-federation")
            .upload(data, data.length, {
              blobHTTPHeaders: {
                blobContentType: "application/entity-statement+jwt",
              },
            }),
        E.toError,
      ),
      TE.map(() => undefined),
      TE.orElse(() => TE.right(undefined)),
    );

export const GenerateEntityConfigurationHandler = H.of(() =>
  pipe(
    createEntityConfiguration,
    RTE.chainW(uploadFile),
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "generateEntityConfiguration",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
