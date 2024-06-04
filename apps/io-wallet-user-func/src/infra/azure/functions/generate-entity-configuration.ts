import { azureFunction } from "@pagopa/handler-kit-azure-func";
import { GenerateEntityConfigurationHandler } from "@/infra/handlers/generate-entity-configuration";

export const GenerateEntityConfigurationFunction = azureFunction(
  GenerateEntityConfigurationHandler
);
