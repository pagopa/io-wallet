import { checkConfig } from './config/config';
import { getCosmosClient } from './cosmos/cosmos';
import { insertFiscalCodes } from './insert-fiscal-codes/insert-fiscal-codes';
import { parseFiscalCodes } from './parse-fiscal-codes/parse-fiscal-codes';

const bootstrap = async () => {
  checkConfig();

  const fiscalCodes = await parseFiscalCodes(
    '../../fiscalCodes/fiscalcodes.csv',
  );

  const cosmosClient = getCosmosClient();

  await insertFiscalCodes(cosmosClient, fiscalCodes);
};

bootstrap();
