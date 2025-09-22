import * as z from "zod";

const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;

const FiscalCode = z.string().length(16).regex(fiscalCodeRegex);

export type FiscalCode = z.infer<typeof FiscalCode>;

export interface FiscalCodeRepository {
  insert(fiscalCode: FiscalCode): Promise<void>;
}

export function whitelistFiscalCode(
  repository: FiscalCodeRepository,
): (fiscalCode: FiscalCode) => Promise<void> {
  return async function (fiscalCode) {
    if (!isValidFiscalCode(fiscalCode)) {
      throw new Error("Invalid fiscal code");
    }
    await repository.insert(fiscalCode);
  };
}

function isValidFiscalCode(code: string): boolean {
  try {
    FiscalCode.parse(code);
    return true;
  } catch (e) {
    return false;
  }
}
