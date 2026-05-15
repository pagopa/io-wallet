import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { StatusListPublicationHandler } from "@/infra/handlers/status-list-publication";

export const StatusListPublicationFunction = azureFunction(
  StatusListPublicationHandler,
);
