import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { IsFiscalCodeWhitelistedHandler } from "@/infra/http/handlers/is-fiscal-code-whitelisted";

export const IsFiscalCodeWhitelistedFunction = httpAzureFunction(
  IsFiscalCodeWhitelistedHandler,
);
