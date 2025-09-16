import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { InsertFiscalCodesInQueueHandler } from "@/infra/handlers/insert-fiscal-codes-in-queue";

export const InsertFiscalCodesInQueueFunction = azureFunction(
  InsertFiscalCodesInQueueHandler,
);
