import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { StatusListPublicationMonitorHandler } from "@/infra/handlers/status-list-publication-monitor";

export const StatusListPublicationMonitorFunction = azureFunction(
  StatusListPublicationMonitorHandler,
);
