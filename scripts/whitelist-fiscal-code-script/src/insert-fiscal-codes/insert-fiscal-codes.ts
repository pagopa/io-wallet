import { CosmosClient } from '@azure/cosmos';
import { sleep } from '../utils/sleep';

export const insertFiscalCodes = async (
  cosmosClient: CosmosClient,
  fiscalCodes: string[],
): Promise<void> => {
  try {
    const sleepTimeBetweenRequestsMs = Number(
      process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS ?? 500,
    );

    const database = cosmosClient.database('wallet');
    const container = database.container('whitelisted-fiscal-codes');

    console.log(`upserting ${fiscalCodes.length} fiscal codes...`);

    for (const fiscalCode of new Set(fiscalCodes)) {
      await container.items.upsert({
        id: fiscalCode,
        createdAt: new Date(),
      });

      console.log(`${fiscalCode} upserted`);

      await sleep(sleepTimeBetweenRequestsMs);
    }

    console.log(`${fiscalCodes.length} fiscal codes upserted`);
  } catch (error) {
    console.error(
      'insert-fiscal-codes.ts: error during fiscal code whitelisting',
    );
    console.error(error);
    throw error;
  }
};
