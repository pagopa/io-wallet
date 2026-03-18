import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateWalletUnitAttestationHandler } from "@/infra/http/handlers/create-wallet-unit-attestation";

export const CreateWalletUnitAttestationFunction = httpAzureFunction(
  CreateWalletUnitAttestationHandler,
);
