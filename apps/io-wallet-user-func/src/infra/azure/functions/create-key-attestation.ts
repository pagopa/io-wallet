import { httpAzureFunction } from "@pagopa/handler-kit-azure-func";

import { CreateKeyAttestationHandler } from "@/infra/http/handlers/create-key-attestation";

export const CreateKeyAttestationFunction = httpAzureFunction(
  CreateKeyAttestationHandler,
);
