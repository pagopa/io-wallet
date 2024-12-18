import { SendEmailOnWalletInstanceRevocationHandler } from "@/infra/handlers/send-email-on-wallet-instance-revocation";
import { azureFunction } from "@pagopa/handler-kit-azure-func";

export const SendEmailOnWalletInstanceRevocationFunction = azureFunction(
  SendEmailOnWalletInstanceRevocationHandler,
);
