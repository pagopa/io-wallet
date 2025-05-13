import { z } from "zod";

import { ECPrivateKeyWithKid } from "../domain/jwk";

export interface Config {
  readonly cosmosdb: {
    readonly databaseName: string;
    readonly endpoint: string;
  };
  readonly signer: {
    readonly jwks: readonly ECPrivateKeyWithKid[];
  };
}

const EnvsCodec = z.object({
  COSMOSDB_DATABASE_NAME: z.string(),
  COSMOSDB_ENDPOINT: z.string(),
  // jwks private keys
  SIGNER_JWK_LIST_BASE64: z.string(),
  isProduction: z.boolean(),
});

/**
 * Read the application configuration and check for invalid values.
 *
 * @returns either the configuration values or an Error
 */
export const getConfigOrError = (
  envs: Record<string, string | undefined>,
): Config => {
  const envCodec = EnvsCodec.parse({
    ...envs,
    isProduction: envs.NODE_ENV === "production",
  });

  const bynari = Buffer.from(
    envCodec.SIGNER_JWK_LIST_BASE64,
    "base64",
  ).toString("binary");
  const jwks = JSON.parse(bynari);

  return {
    cosmosdb: {
      databaseName: envCodec.COSMOSDB_DATABASE_NAME,
      endpoint: envCodec.COSMOSDB_ENDPOINT,
    },
    signer: {
      jwks: jwks,
    },
  };
};
