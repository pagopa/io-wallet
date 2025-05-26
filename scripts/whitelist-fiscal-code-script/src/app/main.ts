import { getArgvParam } from '../get-argv-param';
import { getCosmosClient } from '../infra/azure/cosmos/cosmos';
import { insertFiscalCodes } from '../insert-fiscal-codes';
import { parseFiscalCodes } from '../parse-fiscal-codes';
import { checkConfig } from './config';

const bootstrap = async () => {
  checkConfig();

  const fiscalCodes = await parseFiscalCodes(
    getArgvParam('--input') ?? 'fiscalcodes.csv',
  );

  const cosmosClient = getCosmosClient();

  await insertFiscalCodes(cosmosClient, fiscalCodes);
};

bootstrap();
