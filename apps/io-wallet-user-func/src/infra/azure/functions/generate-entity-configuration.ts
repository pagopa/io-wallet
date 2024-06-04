import { GenerateEntityConfigurationHandler } from "@/infra/handlers/generate-entity-configuration";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const GenerateEntityConfigurationFunction = azureFunction(
  GenerateEntityConfigurationHandler
);
