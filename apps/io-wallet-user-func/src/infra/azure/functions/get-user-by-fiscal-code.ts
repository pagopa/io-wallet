import { GetUserByFiscalCodeHandler } from "@/infra/http/handlers/get-user-by-fiscal-code";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const GetUserByFiscalCodeFunction = httpAzureFunction(
  GetUserByFiscalCodeHandler,
);
