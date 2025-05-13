import { CosmosClient } from '@azure/cosmos';
import * as CsvStringify from 'csv-stringify';
import fs from 'fs';
import { getArgvParam } from '../utils/get-argv-param';
import * as CliProgress from 'cli-progress';
import { fileLogger, logger } from '../utils/get-logger';

const outputDir = getArgvParam('--outputDir') ?? 'logs';

const writeUpsertedFiscalCodes = async (
  upsertedFiscalcodes: string[],
): Promise<void> => {
  const data = [['fiscalCode'], ...upsertedFiscalcodes.map((item) => [item])];

  const options = {
    header: false,
    quoted: false,
  };

  CsvStringify.stringify(data, options, (error, output) => {
    if (!error) {
      fs.writeFileSync(`${outputDir}/whitelisted_fiscal_codes.csv`, output);
      logger.info(
        `whitelisted fiscal codes written to ${outputDir}/whitelisted_fiscal_codes.csv`,
      );
    } else {
      logger.error('error creating CSV file for upserted fiscal codes');
      logger.error(error);
    }
  });
};

const writeNotUpsertedFiscalCodes = async (
  notUpsertedFiscalCodes: {
    fiscalCode: string;
    message: string;
    stack: string;
  }[],
): Promise<void> => {
  const data = [
    ['fiscalCode', 'message', 'stack'],
    ...notUpsertedFiscalCodes.map((item) => [
      item.fiscalCode,
      item.message.replaceAll('"', ''),
      item.stack.replaceAll('"', ''),
    ]),
  ];

  const options = {
    header: false,
    quoted: true,
  };

  CsvStringify.stringify(data, options, (error, output) => {
    if (!error) {
      fs.writeFileSync(`${outputDir}/not_whitelisted_fiscal_codes.csv`, output);
      logger.info(
        `not whitelisted fiscal codes written to ${outputDir}/not_whitelisted_fiscal_codes.csv`,
      );
    } else {
      logger.error('error creating CSV file for not upserted fiscal codes');
      logger.error(error);
    }
  });
};

export const insertFiscalCodes = async (
  cosmosClient: CosmosClient,
  fiscalCodes: string[],
): Promise<void> => {
  const upsertedFiscalCodes: string[] = [];
  const notUpsertedFiscalCodes: {
    fiscalCode: string;
    message: string;
    stack: string;
  }[] = [];

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

    for (const fiscalCode of fiscalCodesSet) {
      try {
        await container.items.upsert({
          id: fiscalCode,
          createdAt: new Date(),
        });

        upsertedFiscalCodes.push(fiscalCode);
        fileLogger.info(`${fiscalCode} upserted with success`);

        await new Promise((resolve) =>
          setTimeout(resolve, sleepTimeBetweenRequestsMs),
        );
      } catch (error) {
        fileLogger.error(`unexpected error upserting ${fiscalCode}`, error);
        notUpsertedFiscalCodes.push({
          fiscalCode,
          message: (error as Error).message,
          stack: (error as Error).stack ?? '',
        });
      }

      classicBar.increment();
    }

    classicBar.stop();

    await writeUpsertedFiscalCodes(upsertedFiscalCodes);
    await writeNotUpsertedFiscalCodes(notUpsertedFiscalCodes);

    logger.info(`${fiscalCodesSet.size} fiscal codes upserted`);
  } catch (error) {
    logger.error(`Unexpected error during fiscal code whitelisting: ${error}`);
  }
};
