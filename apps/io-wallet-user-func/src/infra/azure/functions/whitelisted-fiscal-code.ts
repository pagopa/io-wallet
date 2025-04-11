import { IsFiscalCodeWhitelistedHandler } from "@/infra/http/handlers/whitelisted-fiscal-code";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const IsFiscalCodeWhitelistedFunction = httpAzureFunction(
  IsFiscalCodeWhitelistedHandler,
);
