import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";
import { GetUserByFiscalCodeHandler } from "@/infra/http/handlers/get-user-by-fiscal-code";

export const GetUserByFiscalCodeFunction = httpAzureFunction(
  GetUserByFiscalCodeHandler
);
