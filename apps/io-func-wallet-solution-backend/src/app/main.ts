import * as E from "fp-ts/Either";
import { pipe, identity } from "fp-ts/function";

import { GetEntityConfigurationFunction } from "../infra/azure/functions/get-entity-configuration";
import { InfoFunction } from "../infra/azure/functions/info";
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

export const GetEntityConfiguration = GetEntityConfigurationFunction({
  federationEntityMetadata: config.pagopa.federationEntity,
  supportedSignAlgorithms: config.pagopa.crypto.supportedSignAlgorithms,
});
