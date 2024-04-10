import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateWalletAttestationHandler } from "../../http/handlers/create-wallet-attestation";

export const CreateWalletAttestationFunction = httpAzureFunction(
  CreateWalletAttestationHandler
);
