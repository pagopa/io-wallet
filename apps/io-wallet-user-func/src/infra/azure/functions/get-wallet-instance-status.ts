import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { GetWalletInstanceStatusHandler } from "@/infra/http/handlers/get-wallet-instance-status";

export const GetWalletInstanceStatusFunction = httpAzureFunction(
  GetWalletInstanceStatusHandler,
);
