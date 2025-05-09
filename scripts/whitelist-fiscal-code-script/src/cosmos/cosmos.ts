import { CosmosClient } from '@azure/cosmos';

const DATABASE_CONNECTION_STRING = process.env
  .DATABASE_CONNECTION_STRING as string;

export const getCosmosClient = (): CosmosClient => {
  try {
    return new CosmosClient({
      connectionString: DATABASE_CONNECTION_STRING,
      connectionPolicy: {
        requestTimeout: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
      },
    });
  } catch (error) {
    console.error('cosmos.ts: error getting cosmos client');
    console.error(error);
    throw error;
  }
};
