import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { SetWalletInstanceStatusHandler } from "@/infra/http/handlers/set-wallet-instance-status";

export const SetWalletInstanceStatusFunction = httpAzureFunction(
  SetWalletInstanceStatusHandler,
);
