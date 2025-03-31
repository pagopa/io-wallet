import { AddWalletInstanceByIdHandler } from "@/infra/handlers/add-wallet-instance-by-id";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const AddWalletInstanceByIdFunction = azureFunction(
  AddWalletInstanceByIdHandler,
);
