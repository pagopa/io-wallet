import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateWalletInstanceHandler } from "../../http/handlers/create-wallet-instance";

export const CreateWalletInstanceFunction = httpAzureFunction(
  CreateWalletInstanceHandler
);
