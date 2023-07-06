import * as E from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";

import { GetEntityConfigurationFunction } from "../infra/azure/functions/get-entity-configuration";
import { InfoFunction } from "../infra/azure/functions/info";
import { CryptoSigner } from "../infra/crypto/signer";
import { CreateWalletInstanceAttestationFunction } from "../infra/azure/functions/create-wallet-instance-attestation";
import { getConfigFromEnvironment } from "./config";

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity)
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

export const Info = InfoFunction({});

const signer = new CryptoSigner(config.pagopa.crypto);

export const GetEntityConfiguration = GetEntityConfigurationFunction({
  federationEntityMetadata: config.pagopa.federationEntity,
  signer,
});

export const CreateWalletInstanceAttestation =
  CreateWalletInstanceAttestationFunction({
    federationEntityMetadata: config.pagopa.federationEntity,
    signer,
  });
