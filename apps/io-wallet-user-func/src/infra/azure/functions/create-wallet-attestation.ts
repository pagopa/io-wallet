import { CreateWalletAttestationHandler } from "@/infra/http/handlers/create-wallet-attestation";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const CreateWalletAttestationFunction = httpAzureFunction(
  CreateWalletAttestationHandler,
);
