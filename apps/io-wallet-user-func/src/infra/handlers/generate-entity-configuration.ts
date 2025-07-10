import {
  CertificateRepository,
  getCertificateChainByKid,
} from "@/certificates";
import { EntityConfigurationToJwtModel } from "@/encoders/entity-configuration";
import { EntityConfigurationEnvironment } from "@/entity-configuration";
import { LoA, getLoAUri } from "@/wallet-provider";
import * as H from "@pagopa/handler-kit";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { sequenceS } from "fp-ts/lib/Apply";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { JwkPublicKey, validateJwkKid } from "io-wallet-common/jwk";

import { uploadFile } from "../azure/storage/blob";

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
    federationEntity: { basePath, ...federationEntityMetadata },
  },
  entityConfigurationSigner,
  walletAttestationSigner,
}) =>
  pipe(
    sequenceS(E.Apply)({
      entityConfigurationPublicJwk: pipe(
        entityConfigurationSigner.getFirstPublicKeyByKty("EC"),
        E.chainW(validateJwkKid),
      ),
      federationEntityJwks: entityConfigurationSigner.getPublicKeys(),
      walletProviderJwks: walletAttestationSigner.getPublicKeys(),
    }),
    TE.fromEither,
    TE.chain(
      ({
        entityConfigurationPublicJwk,
        federationEntityJwks,
        walletProviderJwks,
      }) =>
        pipe(
          TE.bindTo("federationEntityJwksWithX5c")(
            pipe(
              federationEntityJwks,
              TE.traverseArray((jwk) =>
                pipe({ certificateRepository }, addCertificateChainToJwk(jwk)),
              ),
            ),
          ),
          TE.bind("walletProviderJwksWithX5c", () =>
            pipe(
              walletProviderJwks,
              TE.traverseArray((jwk) =>
                pipe({ certificateRepository }, addCertificateChainToJwk(jwk)),
              ),
            ),
          ),
          TE.chain(
            ({ federationEntityJwksWithX5c, walletProviderJwksWithX5c }) =>
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
                  jwks: [...federationEntityJwksWithX5c],
                  sub: basePath,
                  walletProviderMetadata: {
                    ascValues: [
                      pipe(basePath, getLoAUri(LoA.basic)),
                      pipe(basePath, getLoAUri(LoA.medium)),
                      pipe(basePath, getLoAUri(LoA.high)),
                    ],
                    jwks: [...walletProviderJwksWithX5c],
                  },
                },
                EntityConfigurationToJwtModel.encode,
                entityConfigurationSigner.createJwtAndSign(
                  { typ: "entity-statement+jwt" },
                  entityConfigurationPublicJwk.kid,
                  "ES256",
                  "24h",
                  // TODO: SIW-2656. env var are not used
                ),
              ),
          ),
        ),
    ),
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
