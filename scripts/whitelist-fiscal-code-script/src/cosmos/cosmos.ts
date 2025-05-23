import { CosmosClient } from '@azure/cosmos';

import { logger } from '../utils/get-logger';

const DATABASE_CONNECTION_STRING = process.env
  .DATABASE_CONNECTION_STRING as string;

export const getCosmosClient = (): CosmosClient => {
  try {
    return new CosmosClient({
      connectionPolicy: {
        requestTimeout: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
      },
      connectionString: DATABASE_CONNECTION_STRING,
    });
  } catch (error) {
    logger.error('cosmos.ts: error getting cosmos client');
    logger.error(error);
    throw error;
  }
};
