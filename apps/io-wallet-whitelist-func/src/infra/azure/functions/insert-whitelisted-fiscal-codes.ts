import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { InsertWhitelistedFiscalCodesHandler } from "@/infra/handlers/insert-whitelisted-fiscal-codes";

export const InsertWhitelistedFiscalCodesFunction = azureFunction(
  InsertWhitelistedFiscalCodesHandler,
);
