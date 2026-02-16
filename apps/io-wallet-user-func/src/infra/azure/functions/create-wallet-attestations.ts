import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateWalletAttestationsHandler } from "@/infra/http/handlers/create-wallet-attestations";

export const CreateWalletAttestationsFunction = httpAzureFunction(
  CreateWalletAttestationsHandler,
);
