import { app } from "@azure/functions";

import * as E from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";

import { GetEntityConfigurationFunction } from "../infra/azure/functions/get-entity-configuration";
import { InfoFunction } from "../infra/azure/functions/info";
import { CryptoSigner } from "../infra/crypto/signer";
import { CreateWalletAttestationFunction } from "../infra/azure/functions/create-wallet-attestation";
import { CreateWalletInstanceFunction } from "../infra/azure/functions/create-wallet-instance";
import { getConfigFromEnvironment } from "./config";

const configOrError = pipe(
  getConfigFromEnvironment(process.env),
  E.getOrElseW(identity)
);

if (configOrError instanceof Error) {
  throw configOrError;
}

const config = configOrError;

const signer = new CryptoSigner(config.crypto);

app.http("healthCheck", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "info",
  handler: InfoFunction({}),
});

app.http("createWalletAttestation", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "token",
  handler: CreateWalletAttestationFunction({
    federationEntityMetadata: config.federationEntity,
    signer,
  }),
});

app.http("createWalletInstance", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "wallet-instance",
  handler: CreateWalletInstanceFunction({
    ...config.attestationService,
  }),
});

app.http("getEntityConfiguration", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: ".well-known/openid-federation!!",
  handler: GetEntityConfigurationFunction({
    federationEntityMetadata: config.federationEntity,
    signer,
  }),
});
