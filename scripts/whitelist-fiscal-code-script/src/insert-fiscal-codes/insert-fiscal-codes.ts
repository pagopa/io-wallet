import { CosmosClient } from '@azure/cosmos';
import * as CliProgress from 'cli-progress';
import {
  whitelistedFiscalCodeFileLogger,
  notWhitelistedFiscalCodeFileLogger,
  logger,
} from '../utils/get-logger';

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

    whitelistedFiscalCodeFileLogger.info('fiscalCode');
    notWhitelistedFiscalCodeFileLogger.info('fiscalCode;message;stack');

    for (const fiscalCode of fiscalCodesSet) {
      try {
        await container.items.upsert({
          id: fiscalCode,
          createdAt: new Date(),
        });

        whitelistedFiscalCodeFileLogger.info(fiscalCode);

        await new Promise((resolve) =>
          setTimeout(resolve, sleepTimeBetweenRequestsMs),
        );
      } catch (error) {
        const errorMessage = (error as Error).message.replaceAll('"', '') ?? '';
        const errorStack = (error as Error).stack?.replaceAll('"', '') ?? '';
        notWhitelistedFiscalCodeFileLogger.info(
          `${fiscalCode};${errorMessage};${errorStack}`,
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
