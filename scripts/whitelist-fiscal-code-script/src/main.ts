import { checkConfig } from './config/config';
import { getCosmosClient } from './cosmos/cosmos';
import { insertFiscalCodes } from './insert-fiscal-codes/insert-fiscal-codes';
import { parseFiscalCodes } from './parse-fiscal-codes/parse-fiscal-codes';
import { getArgvParam } from './utils/get-argv-param';

const bootstrap = async () => {
  checkConfig();

  const fiscalCodes = await parseFiscalCodes(
    getArgvParam('--input') ?? 'fiscalcodes.csv',
  );

  const cosmosClient = getCosmosClient();

  await insertFiscalCodes(cosmosClient, fiscalCodes);
};

bootstrap();
