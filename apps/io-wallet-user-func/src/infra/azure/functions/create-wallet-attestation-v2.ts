import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateWalletAttestationV2Handler } from "@/infra/http/handlers/create-wallet-attestation-v2";

export const CreateWalletAttestationV2Function = httpAzureFunction(
  CreateWalletAttestationV2Handler,
);
