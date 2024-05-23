import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { GetEntityConfigurationHandler } from "../../http/handlers/get-entity-configuration";

export const GetEntityConfigurationFunction = httpAzureFunction(
  GetEntityConfigurationHandler
);
