import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { BackfillWalletInstanceStatusHandler } from "@/infra/handlers/backfill-wallet-instance-status";

export const BackfillWalletInstanceStatusFunction = azureFunction(
  BackfillWalletInstanceStatusHandler,
);
