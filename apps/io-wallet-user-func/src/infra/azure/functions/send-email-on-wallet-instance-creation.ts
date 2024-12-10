import { SendEmailOnWalletInstanceCreationHandler } from "@/infra/handlers/send-email-on-wallet-instance-creation";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const SendEmailOnWalletInstanceCreationFunction = azureFunction(
  SendEmailOnWalletInstanceCreationHandler,
);
