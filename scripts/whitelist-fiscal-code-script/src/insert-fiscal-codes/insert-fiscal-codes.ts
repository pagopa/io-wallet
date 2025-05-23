import { CosmosClient } from '@azure/cosmos';
import * as CliProgress from 'cli-progress';
import fs from 'fs';

import { logger, outputDir } from '../utils/get-logger';

const fiscalCodesStatuses = outputDir + '/fiscal-codes-statuses.csv';

export const insertFiscalCodes = async (
  cosmosClient: CosmosClient,
  fiscalCodes: string[],
): Promise<void> => {
  try {
    const sleepTimeBetweenRequestsMs = Number(
      process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS ?? 500,
    );
    const databaseName = process.env.DATABASE_NAME as string;
    const containerName = process.env.DATABASE_CONTAINER_NAME as string;

    const database = cosmosClient.database(databaseName);
    const container = database.container(containerName);

    logger.info(`upserting ${fiscalCodes.length} fiscal codes...`);
    const fiscalCodesSet = new Set(fiscalCodes);

    const classicBar = new CliProgress.SingleBar(
      {},
      CliProgress.Presets.shades_classic,
    );
    classicBar.start(fiscalCodesSet.size, 0);

    fs.appendFileSync(
      outputDir + '/fiscal-codes-statuses.csv',
      'timestamp;fiscalCode;status\n',
      'utf8',
    );

    for (const fiscalCode of fiscalCodesSet) {
      try {
        await container.items.upsert({
          createdAt: new Date(),
          id: fiscalCode,
        });

        fs.appendFileSync(
          fiscalCodesStatuses,
          `${new Date().toISOString()};${fiscalCode};OK\n`,
          'utf8',
        );

        await new Promise((resolve) =>
          setTimeout(resolve, sleepTimeBetweenRequestsMs),
        );
      } catch (error) {
        const errorMessage = (error as Error).message.replaceAll('"', '') ?? '';
        const errorStack = (error as Error).stack?.replaceAll('"', '') ?? '';
        logger.error(
          `error while inserting fiscal code ${fiscalCode}: ${errorMessage} ${errorStack}`,
        );
        fs.appendFileSync(
          fiscalCodesStatuses,
          `${new Date().toISOString()};${fiscalCode};NOT_OK\n`,
          'utf8',
        );
      }

      classicBar.increment();
    }

    classicBar.stop();

    logger.info(`${fiscalCodesSet.size} fiscal codes upserted`);
  } catch (error) {
    logger.error(`Unexpected error during fiscal code whitelisting: ${error}`);
  }
};
