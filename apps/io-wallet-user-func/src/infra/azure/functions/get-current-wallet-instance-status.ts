import { GetCurrentWalletInstanceStatusHandler } from "@/infra/http/handlers/get-current-wallet-instance-status";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const GetCurrentWalletInstanceStatusFunction = httpAzureFunction(
  GetCurrentWalletInstanceStatusHandler,
);
