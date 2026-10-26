import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateEntityConfigurationV2Handler } from "@/infra/http/handlers/create-entity-configuration-v2";

export const CreateEntityConfigurationV2Function = httpAzureFunction(
  CreateEntityConfigurationV2Handler,
);
