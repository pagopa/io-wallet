import { CosmosClient } from "@azure/cosmos";

import { logger } from "../../../get-logger";

export const getCosmosClient = (): CosmosClient => {
  try {
    return new CosmosClient({
      connectionPolicy: {
        requestTimeout: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
      },
      connectionString: process.env.DATABASE_CONNECTION_STRING,
    });
  } catch (error) {
    logger.error("cosmos.ts: error getting cosmos client");
    logger.error(error);
    throw error;
  }
};
