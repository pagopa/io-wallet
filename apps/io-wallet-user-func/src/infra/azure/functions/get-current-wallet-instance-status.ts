import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { GetCurrentWalletInstanceStatusHandler } from "@/infra/http/handlers/get-current-wallet-instance-status";

export const GetCurrentWalletInstanceStatusFunction = httpAzureFunction(
  GetCurrentWalletInstanceStatusHandler,
);
