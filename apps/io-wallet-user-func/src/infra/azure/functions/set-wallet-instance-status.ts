import { SetWalletInstanceStatusHandler } from "@/infra/http/handlers/set-wallet-instance-status";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const SetWalletInstanceStatusFunction = httpAzureFunction(
  SetWalletInstanceStatusHandler,
);
