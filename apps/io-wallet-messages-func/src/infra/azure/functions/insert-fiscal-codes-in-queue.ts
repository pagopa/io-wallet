import { InsertFiscalCodesInQueueHandler } from "@/infra/handlers/insert-fiscal-codes-in-queue";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const InsertFiscalCodesInQueueFunction = azureFunction(
  InsertFiscalCodesInQueueHandler,
);
