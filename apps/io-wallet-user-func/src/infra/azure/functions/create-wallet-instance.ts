import { CreateWalletInstanceHandler } from "@/infra/http/handlers/create-wallet-instance";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const CreateWalletInstanceFunction = httpAzureFunction(
  CreateWalletInstanceHandler,
);
