import { CheckFiscalCodeHandler } from "@/infra/http/handlers/check-fiscal-code";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const CheckFiscalCodeFunction = httpAzureFunction(
  CheckFiscalCodeHandler,
);
