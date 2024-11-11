import { ValidateWalletInstanceAttestedKeyHandler } from "@/infra/handlers/validate-wallet-instance-attested-key";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const ValidateWalletInstanceAttestedKeyFunction = azureFunction(
  ValidateWalletInstanceAttestedKeyHandler,
);
