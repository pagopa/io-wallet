import { z } from "zod";
import { ECPrivateKeyWithKid } from "../domain/jwk";

export interface Config {
  readonly cosmosdb: {
    readonly endpoint: string;
    readonly databaseName: string;
  };
  readonly signer: {
    readonly jwks: readonly ECPrivateKeyWithKid[];
  };
}

const EnvsCodec = z.object({
  COSMOSDB_ENDPOINT: z.string(),
  COSMOSDB_DATABASE_NAME: z.string(),
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
  envs: Record<string, undefined | string>,
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
      endpoint: envCodec.COSMOSDB_ENDPOINT,
      databaseName: envCodec.COSMOSDB_DATABASE_NAME,
    },
    signer: {
      jwks: jwks,
    },
  };
};
