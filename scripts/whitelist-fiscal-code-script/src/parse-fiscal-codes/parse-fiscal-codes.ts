import fs from 'fs';
import * as csv from 'csv-parse';

export const parseFiscalCodes = async (
  csvFilePath: string,
): Promise<string[]> => {
  try {
    const fiscalCodes: string[] = [];

    const parser = csv.parse({
      delimiter: ',',
      skip_empty_lines: true,
      trim: true,
    });

    if (!fs.existsSync(csvFilePath)) {
      throw new Error('file not found');
    }

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(parser)
        .on('data', (row: string[]) => {
          fiscalCodes.push(row[0]);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    fiscalCodes.shift();

    console.log(`Loaded ${fiscalCodes.length} fiscal codes from CSV file`);

    return fiscalCodes;
  } catch (error) {
    console.error('parse-fiscal-code.ts: error parsing fiscal codes');
    console.error(error);
    throw error;
  }
};
