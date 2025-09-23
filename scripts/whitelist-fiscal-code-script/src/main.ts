import { CosmosClient } from "@azure/cosmos";
import * as dotenv from "dotenv";

import { FiscalCode, whitelistFiscalCode } from "./app/whitelist-fiscal-code";
import { getConfig } from "./config";
import { CosmosFiscalCodeRepository } from "./infra/cosmos-fiscal-code";
import { readFiscalCodesFromFile } from "./infra/file-fiscal-code";

dotenv.config({ quiet: true });

const config = getConfig(process.env);

const cosmosClient = new CosmosClient({
  connectionPolicy: {
    requestTimeout: 5000,
  },
  connectionString: config.cosmosAccountConnectionString,
});

const database = cosmosClient.database(config.cosmosDatabaseName);

const container = database.container(config.cosmosContainerName);

const fiscalCodeRepository = new CosmosFiscalCodeRepository(
  container,
  "./output.csv",
);

const fiscalCodes = readFiscalCodesFromFile("./fiscalcodes.csv");

async function main({
  fiscalCodes,
  whitelistFiscalCode,
}: {
  fiscalCodes: string[];
  whitelistFiscalCode: (fiscalCode: FiscalCode) => Promise<void>;
}) {
  for (const fiscalCode of fiscalCodes) {
    await whitelistFiscalCode(fiscalCode);
  }
}

main({
  fiscalCodes,
  whitelistFiscalCode: whitelistFiscalCode(fiscalCodeRepository),
});
