import { CreateWalletInstanceHandler } from "@/infra/handlers/create-wallet-instance";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const CreateWalletInstanceFunction = azureFunction(
  CreateWalletInstanceHandler,
);
