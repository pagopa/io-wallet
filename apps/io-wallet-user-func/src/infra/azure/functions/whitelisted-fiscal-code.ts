import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { IsFiscalCodeWhitelistedHandler } from "@/infra/http/handlers/whitelisted-fiscal-code";

export const IsFiscalCodeWhitelistedFunction = httpAzureFunction(
  IsFiscalCodeWhitelistedHandler,
);
