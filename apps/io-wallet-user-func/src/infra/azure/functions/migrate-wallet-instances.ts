import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { MigrateWalletInstancesHandler } from "@/infra/handlers/migrate-wallet-instances";

export const MigrateWalletInstancesFunction = azureFunction(
  MigrateWalletInstancesHandler,
);
