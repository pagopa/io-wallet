import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { AddWalletInstanceToValidationQueueHandler } from "@/infra/handlers/add-wallet-instance-to-validation-queue";

export const AddWalletInstanceToValidationQueueFunction = azureFunction(
  AddWalletInstanceToValidationQueueHandler,
);
