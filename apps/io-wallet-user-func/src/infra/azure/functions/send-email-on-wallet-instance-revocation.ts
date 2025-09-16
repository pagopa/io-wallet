import { azureFunction } from "@pagopa/handler-kit-azure-func";

import { SendEmailOnWalletInstanceRevocationHandler } from "@/infra/handlers/send-email-on-wallet-instance-revocation";

export const SendEmailOnWalletInstanceRevocationFunction = azureFunction(
  SendEmailOnWalletInstanceRevocationHandler,
);
