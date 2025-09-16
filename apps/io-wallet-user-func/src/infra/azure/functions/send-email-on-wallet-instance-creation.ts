import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { SendEmailOnWalletInstanceCreationHandler } from "@/infra/handlers/send-email-on-wallet-instance-creation";

export const SendEmailOnWalletInstanceCreationFunction = azureFunction(
  SendEmailOnWalletInstanceCreationHandler,
);
