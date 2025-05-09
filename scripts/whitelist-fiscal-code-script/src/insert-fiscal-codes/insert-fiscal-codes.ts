import { CosmosClient } from '@azure/cosmos';
import { sleep } from '../utils/sleep';
import * as CsvStringify from 'csv-stringify';
import fs from 'fs';

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
      fs.writeFileSync('logs/whitelisted_fiscal_codes.csv', output);
      console.log("whitelisted fiscal codes written to logs/whitelisted_fiscal_codes.csv");
    } else {
      console.error('error creating CSV file for upserted fiscal codes');
      console.error(error);
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
      fs.writeFileSync('logs/not_whitelisted_fiscal_codes.csv', output);
      console.log("not whitelisted fiscal codes written to logs/not_whitelisted_fiscal_codes.csv");
    } else {
      console.error('error creating CSV file for not upserted fiscal codes');
      console.error(error);
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

    const database = cosmosClient.database('wallet');
    const container = database.container('whitelisted-fiscal-codes');

    console.log(`upserting ${fiscalCodes.length} fiscal codes...`);

    for (const fiscalCode of new Set(fiscalCodes)) {
      try {
        await container.items.upsert({
          id: fiscalCode,
          createdAt: new Date(),
        });

        upsertedFiscalCodes.push(fiscalCode);

        console.log(`${fiscalCode} upserted`);

        await sleep(sleepTimeBetweenRequestsMs);
      } catch (error) {
        console.error(`${fiscalCode} not upserted`);
        notUpsertedFiscalCodes.push({
          fiscalCode,
          message: (error as Error).message,
          stack: (error as Error).stack ?? '',
        });
      }
    }

    await writeUpsertedFiscalCodes(upsertedFiscalCodes);
    await writeNotUpsertedFiscalCodes(notUpsertedFiscalCodes);

    console.log(`${fiscalCodes.length} fiscal codes upserted`);
  } catch (error) {
    console.error(
      'insert-fiscal-codes.ts: unexpected error during fiscal code whitelisting',
    );
    console.error(error);
    throw error;
  }
};
