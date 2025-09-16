import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { DeleteWalletInstancesHandler } from "@/infra/http/handlers/delete-wallet-instances";

export const DeleteWalletInstancesFunction = httpAzureFunction(
  DeleteWalletInstancesHandler,
);
