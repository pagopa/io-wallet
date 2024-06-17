import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";
import { CreateWalletInstanceHandler } from "@/infra/http/handlers/create-wallet-instance";

export const CreateWalletInstanceFunction = httpAzureFunction(
  CreateWalletInstanceHandler
);
