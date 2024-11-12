import { FiscalCode } from "@pagopa/ts-commons/lib/strings";

// Load testing users have a dummy fiscal code that starts with: LVTEST00A00
export const isLoadTestUser = (fiscalCode: FiscalCode) =>
  fiscalCode.startsWith("LVTEST00A00");

export const obfuscatedUserId = (fiscalCode: FiscalCode) => {
  const visibleStart = fiscalCode.slice(0, 6);
  const visibleEnd = fiscalCode.slice(-1);
  const obfuscatedMiddle = "*".repeat(fiscalCode.length - 7);
  return `${visibleStart}${obfuscatedMiddle}${visibleEnd}`;
};
