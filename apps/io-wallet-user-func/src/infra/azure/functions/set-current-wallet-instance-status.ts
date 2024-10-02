import { SetCurrentWalletInstanceStatusHandler } from "@/infra/http/handlers/set-current-wallet-instance-status";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const SetCurrentWalletInstanceStatusFunction = httpAzureFunction(
  SetCurrentWalletInstanceStatusHandler,
);
