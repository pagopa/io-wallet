import { AddWalletInstanceUserIdHandler } from "@/infra/handlers/add-wallet-instance-user-id";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const AddWalletInstanceUserIdFunction = azureFunction(
  AddWalletInstanceUserIdHandler,
);
