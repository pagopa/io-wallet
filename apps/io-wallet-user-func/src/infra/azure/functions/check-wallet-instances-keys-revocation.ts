import { CheckWalletInstancesAttestedKeyRevocationHandler } from "@/infra/handlers/check-wallet-instances-keys-revocation";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const CheckWalletInstancesAttestedKeyRevocationFunction = azureFunction(
  CheckWalletInstancesAttestedKeyRevocationHandler,
);
