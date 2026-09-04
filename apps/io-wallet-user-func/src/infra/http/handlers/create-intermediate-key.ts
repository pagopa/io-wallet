import { CertificateClient } from "@azure/keyvault-certificates";
import { KeyClient } from "@azure/keyvault-keys";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { ECKeyWithKid, ECKeyWithoutKid } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";

import { toPublicEcJwk } from "@/infra/azure/key-vault/key";
import { createKey as createKeyOnDatabase, Key, KeyRepository } from "@/keys";
import { sendTelemetryExceptionWithBody } from "@/telemetry";

type CreateIntermediateKeyEnvironment = KeyVaultEnvironment & {
  keyRepository: KeyRepository;
};

interface KeyVaultEnvironment {
  certificateClient: Pick<CertificateClient, "getCertificate">;
  keyClient: Pick<KeyClient, "getKey">;
}

const CreateIntermediateKeyRequestPayload = t.type({
  keyName: NonEmptyString,
});

type CreateIntermediateKeyRequestPayload = t.TypeOf<
  typeof CreateIntermediateKeyRequestPayload
>;

const requireCreateIntermediateKeyRequest = (req: H.HttpRequest) =>
  pipe(req.body, H.parse(CreateIntermediateKeyRequestPayload));

const addKidFromThumbprint = (
  publicKey: ECKeyWithoutKid,
): TE.TaskEither<Error, ECKeyWithKid> =>
  pipe(
    TE.tryCatch(() => calculateJwkThumbprint(publicKey, "sha256"), E.toError),
    TE.map((kid) => ({ ...publicKey, kid })),
  );

const getCertificateFromKeyVault =
  (keyName: string): RTE.ReaderTaskEither<KeyVaultEnvironment, Error, string> =>
  ({ certificateClient }) =>
    pipe(
      TE.tryCatch(
        () => certificateClient.getCertificate(keyName),
        (reason) =>
          new Error(
            `Unable to get certificate from Azure Key Vault: ${reason}`,
          ),
      ),
      TE.chain((certificate) =>
        pipe(
          certificate.cer,
          TE.fromNullable(
            new Error("Key Vault certificate has no certificate material"),
          ),
        ),
      ),
      TE.map((certificate) => Buffer.from(certificate).toString("base64")),
    );

const getPublicKeyFromKeyVault =
  (
    keyName: string,
  ): RTE.ReaderTaskEither<KeyVaultEnvironment, Error, ECKeyWithoutKid> =>
  ({ keyClient }) =>
    pipe(
      TE.tryCatch(
        () => keyClient.getKey(keyName),
        (reason) =>
          new Error(`Unable to get key from Azure Key Vault: ${reason}`),
      ),
      TE.chainW(flow(toPublicEcJwk, TE.fromEither)),
    );

const createIntermediateKey =
  ({
    keyName,
  }: CreateIntermediateKeyRequestPayload): RTE.ReaderTaskEither<
    CreateIntermediateKeyEnvironment,
    Error,
    Key
  > =>
  (environment) =>
    pipe(
      sequenceS(TE.ApplyPar)({
        certificate: pipe(environment, getCertificateFromKeyVault(keyName)),
        publicKey: pipe(environment, getPublicKeyFromKeyVault(keyName)),
      }),
      TE.chainW(({ certificate, publicKey }) =>
        pipe(
          publicKey,
          addKidFromThumbprint,
          TE.map((publicKey) => ({
            certificateChain: [certificate],
            keyName,
            publicKey,
          })),
        ),
      ),
      TE.chainFirstW((key) => pipe(environment, createKeyOnDatabase(key))),
    );

export const CreateIntermediateKeyHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireCreateIntermediateKeyRequest,
    RTE.fromEither,
    RTE.chainW(createIntermediateKey),
    RTE.map(({ certificateChain, keyName, publicKey }) => ({
      certificate_chain: certificateChain,
      id: keyName,
      public_key: publicKey,
    })),
    RTE.map(H.successJson),
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createIntermediateKey",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
