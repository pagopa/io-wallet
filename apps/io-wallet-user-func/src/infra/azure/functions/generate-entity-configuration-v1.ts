import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { GenerateEntityConfigurationV1Handler } from "@/infra/handlers/generate-entity-configuration-v1";

export const GenerateEntityConfigurationV1Function = azureFunction(
  GenerateEntityConfigurationV1Handler,
);
