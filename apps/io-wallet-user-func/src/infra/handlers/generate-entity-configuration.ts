import { CdnManagementClient } from "@azure/arm-cdn";
import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { ECPrivateKeyWithKid, JwkPublicKey } from "io-wallet-common/jwk";

import {
  CertificateRepository,
  getCertificateChainByKid,
} from "@/certificates";
import { EntityConfigurationToJwtModel } from "@/encoders/entity-configuration";
import { EntityConfigurationEnvironment } from "@/entity-configuration";
import { uploadFile } from "@/infra/azure/storage/blob";
import { signJwt } from "@/infra/crypto/signer";
import { sendTelemetryException } from "@/infra/telemetry";
import { getLoAUri, LoA } from "@/wallet-provider";

const toPublicJwk = ({ crv, kid, kty, x, y }: ECPrivateKeyWithKid) => ({
  crv,
  kid,
  kty,
  x,
  y,
});

const addCertificateChainToJwk = (
  jwk: JwkPublicKey,
): RTE.ReaderTaskEither<
  { certificateRepository: CertificateRepository },
  Error,
  JwkPublicKey
> =>
  pipe(
    O.fromNullable(jwk.kid),
    O.fold(
      () => RTE.right(jwk),
      (kid) =>
        pipe(
          kid,
          getCertificateChainByKid,
          RTE.map(
            flow(
              O.map((chain) => ({ ...jwk, x5c: chain })),
              O.getOrElse(() => jwk),
            ),
          ),
        ),
    ),
  );

// Create the JWT payload for the entity configuration metadata and return the signed JWT
const createEntityConfiguration: RTE.ReaderTaskEither<
  EntityConfigurationEnvironment,
  Error,
  string
> = ({
  certificateRepository,
  entityConfiguration: {
    authorityHints,
    federationEntity: { basePathV10: basePath, ...federationEntityMetadata },
  },
  intermediateSigningKey,
  intermediateSigningKeys,
  leafSigningKeys,
}) =>
  pipe(
    {
      intermediatePublicJwks: intermediateSigningKeys.map(toPublicJwk),
      leafPublicJwks: leafSigningKeys.map(toPublicJwk),
    },
    ({ intermediatePublicJwks, leafPublicJwks }) =>
      pipe(
        intermediatePublicJwks,
        TE.traverseArray((jwk) =>
          // TODO [SIW-2719]: Add certificate chain validation and ensure the system handles any issues appropriately
          pipe({ certificateRepository }, addCertificateChainToJwk(jwk)),
        ),
        TE.bindTo("intermediateJwksWithX5c"),
        TE.bind("leafJwksWithX5c", () =>
          pipe(
            leafPublicJwks,
            TE.traverseArray((jwk) =>
              pipe({ certificateRepository }, addCertificateChainToJwk(jwk)),
            ),
          ),
        ),
        TE.chain(({ intermediateJwksWithX5c, leafJwksWithX5c }) =>
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
              jwks: [...intermediateJwksWithX5c],
              sub: basePath,
              walletProviderMetadata: {
                ascValues: [
                  pipe(basePath, getLoAUri(LoA.basic)),
                  pipe(basePath, getLoAUri(LoA.medium)),
                  pipe(basePath, getLoAUri(LoA.high)),
                ],
                jwks: [...leafJwksWithX5c],
              },
            },
            EntityConfigurationToJwtModel.encode,
            (payload) =>
              signJwt(intermediateSigningKey)({
                // TODO: SIW-2656. env var are not used
                duration: "24h",
                header: {
                  alg: "ES256",
                  typ: "entity-statement+jwt",
                },
                payload,
              }),
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
