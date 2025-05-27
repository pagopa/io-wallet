import * as csv from "csv-parse";
import fs from "fs";

import { logger } from "./get-logger";

export const parseFiscalCodes = async (
  csvFilePath: string,
): Promise<string[]> => {
  try {
    const fiscalCodes: string[] = [];

    const parser = csv.parse({
      delimiter: ",",
      skip_empty_lines: true,
      trim: true,
    });

    if (!fs.existsSync(csvFilePath)) {
      throw new Error("file not found");
    }

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(parser)
        .on("data", (row: string[]) => {
          fiscalCodes.push(row[0]);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (fiscalCodes.length === 0) {
      logger.warn("the CSV file is empty or does not contain a header row.");
      return [];
    }

    fiscalCodes.shift();

    logger.info(`Loaded ${fiscalCodes.length} fiscal codes from CSV file`);

    return fiscalCodes;
  } catch (error) {
    logger.error("parse-fiscal-code.ts: error parsing fiscal codes");
    if (error instanceof Error) {
      logger.error(error.message);
      logger.error(error.stack);
    }
    throw error;
  }
};
