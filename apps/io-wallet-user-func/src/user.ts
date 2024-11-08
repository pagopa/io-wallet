import { FiscalCode } from "@pagopa/ts-commons/lib/strings";

// Load testing users have a dummy fiscal code that starts with: LVTEST00A00
export const isLoadTestUser = (fiscalCode: FiscalCode) =>
  fiscalCode.startsWith("LVTEST00A00");
