import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateWalletInstanceAttestationHandler } from "@/infra/http/handlers/create-wallet-instance-attestation";

export const CreateWalletInstanceAttestationFunction = httpAzureFunction(
  CreateWalletInstanceAttestationHandler,
);
