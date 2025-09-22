import { Container } from "@azure/cosmos";
import * as fs from "fs";

import { FiscalCode, FiscalCodeRepository } from "../app/whitelist-fiscal-code";

export class CosmosFiscalCodeRepository implements FiscalCodeRepository {
  constructor(
    private container: Container,
    private outputFilePath: string,
  ) {}

  async insert(fiscalCode: FiscalCode): Promise<void> {
    try {
      await this.container.items.upsert({
        createdAt: new Date(),
        id: fiscalCode,
      });
      fs.appendFileSync(this.outputFilePath, `${fiscalCode},OK\n`, "utf8");
    } catch (error) {
      if (error instanceof Error) {
        fs.appendFileSync(
          this.outputFilePath,
          `${fiscalCode},KO,${error.message}\n`,
          "utf8",
        );
      } else {
        fs.appendFileSync(this.outputFilePath, `${fiscalCode},KO\n`, "utf8");
      }
    }
  }
}
