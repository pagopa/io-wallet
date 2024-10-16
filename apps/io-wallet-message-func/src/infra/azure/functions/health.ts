import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { HealthHandler } from "../../http/handlers/health";

export const HealthFunction = httpAzureFunction(HealthHandler);
