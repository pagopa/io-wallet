import { DeleteWalletInstancesHandler } from "@/infra/http/handlers/delete-wallet-instances";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const DeleteWalletInstancesFunction = httpAzureFunction(
  DeleteWalletInstancesHandler,
);
