import { AddWalletInstanceToValidationQueueHandler } from "@/infra/handlers/add-wallet-instance-to-validation-queue";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const AddWalletInstanceToValidationQueueFunction = azureFunction(
  AddWalletInstanceToValidationQueueHandler,
);
