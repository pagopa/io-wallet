import { GetWalletInstanceStatusHandler } from "@/infra/http/handlers/get-wallet-instance-status";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const GetWalletInstanceStatusFunction = httpAzureFunction(
  GetWalletInstanceStatusHandler,
);
