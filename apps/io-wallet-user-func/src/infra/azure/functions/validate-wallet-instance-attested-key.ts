import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { ValidateWalletInstanceAttestedKeyHandler } from "@/infra/handlers/validate-wallet-instance-attested-key";

export const ValidateWalletInstanceAttestedKeyFunction = azureFunction(
  ValidateWalletInstanceAttestedKeyHandler,
);
