import { CreateWalletAttestationV2Handler } from "@/infra/http/handlers/create-wallet-attestation-v2";
import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

export const CreateWalletAttestationV2Function = httpAzureFunction(
  CreateWalletAttestationV2Handler,
);
