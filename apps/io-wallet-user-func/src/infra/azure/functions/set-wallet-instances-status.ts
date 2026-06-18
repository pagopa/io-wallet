import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { SetWalletInstancesStatusHandler } from "@/infra/http/handlers/set-wallet-instances-status";

export const SetWalletInstancesStatusFunction = httpAzureFunction(
  SetWalletInstancesStatusHandler,
);
