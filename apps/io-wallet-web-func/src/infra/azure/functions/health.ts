import { HealthHandler } from "@/infra/http/handlers/health";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const HealthFunction = httpAzureFunction(HealthHandler);
