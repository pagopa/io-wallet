import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { RevokeWalletInstancesHandler } from "@/infra/handlers/revoke-wallet-instances";

export const RevokeWalletInstancesFunction = azureFunction(
  RevokeWalletInstancesHandler,
);
