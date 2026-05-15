import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { StatusListPublicationDispatcherHandler } from "@/infra/handlers/status-list-publication-dispatcher";

export const StatusListPublicationDispatcherFunction = azureFunction(
  StatusListPublicationDispatcherHandler,
);
