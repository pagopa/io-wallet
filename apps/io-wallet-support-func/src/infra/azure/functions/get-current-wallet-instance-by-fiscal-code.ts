import { GetCurrentWalletInstanceByFiscalCodeHandler } from "@/infra/http/handlers/get-current-wallet-instance-by-fiscal-code";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const GetCurrentWalletInstanceByFiscalCodeFunction = httpAzureFunction(
  GetCurrentWalletInstanceByFiscalCodeHandler,
);
