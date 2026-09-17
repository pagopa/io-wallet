import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { GenerateEntityConfigurationV2Handler } from "@/infra/handlers/generate-entity-configuration-v2";

export const GenerateEntityConfigurationV2Function = azureFunction(
  GenerateEntityConfigurationV2Handler,
);
