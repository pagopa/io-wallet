import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { GetCurrentWalletInstanceByFiscalCodeHandler } from "@/infra/http/handlers/get-current-wallet-instance-by-fiscal-code";

export const GetCurrentWalletInstanceByFiscalCodeFunction = httpAzureFunction(
  GetCurrentWalletInstanceByFiscalCodeHandler,
);
