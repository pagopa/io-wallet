import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { EnqueueWhitelistedFiscalCodesHandler } from "@/infra/handlers/enqueue-whitelisted-fiscal-codes";

export const EnqueueWhitelistedFiscalCodesFunction = azureFunction(
  EnqueueWhitelistedFiscalCodesHandler,
);
