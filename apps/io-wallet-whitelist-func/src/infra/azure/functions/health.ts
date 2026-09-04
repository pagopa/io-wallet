import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { HealthHandler } from "@/infra/http/handlers/health";

export const HealthFunction = httpAzureFunction(HealthHandler);
