import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { CopyWalletInstancesToUatHandler } from "@/infra/handlers/copy-wallet-instances-to-uat";

export const CopyWalletInstancesToUatFunction = azureFunction(
  CopyWalletInstancesToUatHandler,
);
