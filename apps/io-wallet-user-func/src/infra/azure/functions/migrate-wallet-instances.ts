import { MigrateWalletInstancesHandler } from "@/infra/handlers/migrate-wallet-instances";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const MigrateWalletInstancesFunction = azureFunction(
  MigrateWalletInstancesHandler,
);
