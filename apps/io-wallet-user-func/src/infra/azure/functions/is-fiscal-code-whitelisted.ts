import { IsFiscalCodeWhitelistedHandler } from "@/infra/http/handlers/is-fiscal-code-whitelisted";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const IsFiscalCodeWhitelistedFunction = httpAzureFunction(
  IsFiscalCodeWhitelistedHandler,
);
