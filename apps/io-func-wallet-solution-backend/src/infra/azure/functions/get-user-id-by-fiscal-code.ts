import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";
import { GetUserIdByFiscalCodeHandler } from "@/infra/http/handlers/get-user-id-by-fiscal-code";

export const GetUserIdByFiscalCodeFunction = httpAzureFunction(
  GetUserIdByFiscalCodeHandler
);
