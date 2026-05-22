import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { StatusListManagerHandler } from "@/infra/handlers/status-list-manager";

export const StatusListManagerFunction = azureFunction(
  StatusListManagerHandler,
);
