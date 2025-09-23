import * as fs from "fs";

export function readFiscalCodesFromFile(inputFilePath: string): string[] {
  const data = fs.readFileSync(inputFilePath, "utf8");

  return data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
