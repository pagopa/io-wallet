import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateEntityConfigurationV1Handler } from "@/infra/http/handlers/create-entity-configuration-v1";

export const CreateEntityConfigurationV1Function = httpAzureFunction(
  CreateEntityConfigurationV1Handler,
);
